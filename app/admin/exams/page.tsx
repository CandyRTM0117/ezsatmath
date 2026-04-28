import { createClient } from '@/lib/supabase/server'
import ExamTrackerClient from './ExamTrackerClient'

export default async function ExamTrackerPage() {
  const supabase = await createClient()

  const { data: exams } = await supabase
    .from('exams')
    .select('*, user:users(id, name, email)')
    .order('taken_at', { ascending: false })

  return <ExamTrackerClient initialExams={exams ?? []} />
}
