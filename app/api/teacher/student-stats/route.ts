import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertTeacher() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  return profile?.role === 'teacher' || profile?.role === 'admin' ? user : null
}

function toSatScore(raw: number, total: number) {
  if (total === 0) return 200
  return Math.round(200 + (raw / total) * 600)
}

export async function GET(req: NextRequest) {
  const caller = await assertTeacher()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = req.nextUrl.searchParams.get('studentId')
  if (!studentId) return NextResponse.json({ error: 'Missing studentId' }, { status: 400 })

  const admin = adminSupabase()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    attemptsRes,
    recentAttemptsRes,
    examsRes,
    examAnswersRes,
    correctExamAnswersRes,
    todosRes,
  ] = await Promise.all([
    admin.from('problem_attempts').select('is_correct').eq('user_id', studentId),
    admin.from('problem_attempts').select('attempted_at, is_correct').eq('user_id', studentId).gte('attempted_at', thirtyDaysAgo.toISOString()).order('attempted_at', { ascending: true }),
    admin.from('exams').select('id, part, score, total, taken_at').eq('user_id', studentId).order('taken_at', { ascending: false }),
    admin.from('exam_answers').select('exam_id, exams!inner(user_id)', { count: 'exact', head: true }).eq('exams.user_id', studentId),
    admin.from('exam_answers').select('exam_id, exams!inner(user_id)', { count: 'exact', head: true }).eq('exams.user_id', studentId).eq('is_correct', true),
    admin.from('todo_tasks').select('id, task_text, completed, expires_at').eq('user_id', studentId).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true }),
  ])

  const allAttempts = attemptsRes.data ?? []
  const exams = (examsRes.data ?? []) as { id: string; part: number; score: number; total: number; taken_at: string }[]

  // Compute domain stats from best exam pair
  let domainStats: { name: string; correct: number; total: number }[] | null = null
  const part1s = exams.filter(e => e.part === 1)
  let bestPair: { e1Id: string; e2Id?: string } | null = null
  let bestSat = -1
  for (const e1 of part1s) {
    const e2 = exams.find(e =>
      e.part === 2 &&
      Math.abs(new Date(e.taken_at).getTime() - new Date(e1.taken_at).getTime()) < 48 * 3600 * 1000
    )
    const sat = toSatScore(e1.score + (e2?.score ?? 0), e1.total + (e2?.total ?? 0))
    if (sat > bestSat) { bestSat = sat; bestPair = { e1Id: e1.id, e2Id: e2?.id } }
  }
  if (bestPair) {
    const examIds = [bestPair.e1Id, bestPair.e2Id].filter(Boolean) as string[]
    const { data: domainAnswers } = await admin
      .from('exam_answers')
      .select('is_correct, problem:problems(category)')
      .in('exam_id', examIds)
    if (domainAnswers) {
      const map: Record<string, { correct: number; total: number }> = {}
      for (const a of domainAnswers) {
        const cat = ((a.problem as any)?.category as string) ?? 'Other'
        if (!map[cat]) map[cat] = { correct: 0, total: 0 }
        map[cat].total++
        if (a.is_correct) map[cat].correct++
      }
      domainStats = Object.entries(map)
        .map(([name, s]) => ({ name, correct: s.correct, total: s.total }))
        .sort((a, b) => b.total - a.total)
    }
  }

  return NextResponse.json({
    attempts: allAttempts,
    recentAttempts: recentAttemptsRes.data ?? [],
    exams,
    totalExamAnswers: examAnswersRes.count ?? 0,
    correctExamAnswers: correctExamAnswersRes.count ?? 0,
    domainStats,
    todos: todosRes.data ?? [],
  })
}
