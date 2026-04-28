import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]
  const { count: solvedToday } = await supabase
    .from('problem_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('attempted_at', today)

  const { count: totalAttempts } = await supabase
    .from('problem_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: correctAttempts } = await supabase
    .from('problem_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_correct', true)

  const { data: exams } = await supabase
    .from('exams')
    .select('*')
    .eq('user_id', user.id)
    .order('taken_at', { ascending: false })
    .limit(5)

  const accuracy = totalAttempts ? Math.round((correctAttempts ?? 0) / totalAttempts * 100) : 0

  const stats = [
    { label: 'Solved Today', value: solvedToday ?? 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Total Problems', value: totalAttempts ?? 0, color: 'bg-purple-50 text-purple-700' },
    { label: 'Problem Accuracy', value: `${accuracy}%`, color: 'bg-green-50 text-green-700' },
    { label: 'Exams Taken', value: exams?.length ?? 0, color: 'bg-orange-50 text-orange-700' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.name ?? 'Student'}!</h1>
        <p className="text-slate-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color.split(' ')[1]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Recent Exams</h2>
          {exams && exams.length > 0 ? (
            <div className="space-y-2">
              {exams.map(e => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-slate-800">Part {e.part}</span>
                    <span className="text-xs text-slate-400 ml-2">{new Date(e.taken_at).toLocaleDateString()}</span>
                  </div>
                  <span className={`text-sm font-semibold ${e.score / e.total >= 0.8 ? 'text-green-600' : e.score / e.total >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {e.score}/{e.total}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No exams taken yet. <a href="/student/exam" className="text-blue-600 hover:underline">Take your first exam →</a></p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Account Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-slate-500 w-20">Name</span>
              <span className="text-slate-900 font-medium">{profile?.name ?? '—'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-20">Email</span>
              <span className="text-slate-900">{profile?.email}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500 w-20">Joined</span>
              <span className="text-slate-900">{new Date(profile?.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-slate-500 w-20">Plan</span>
              {profile?.is_subscribed ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                  Pro
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                  Free
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
