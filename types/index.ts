export type Role = 'admin' | 'student' | 'teacher'

export interface User {
  id: string
  email: string
  name: string | null
  role: Role
  is_subscribed: boolean
  created_at: string
}

export type ProblemCategory = 'Algebra' | 'Trigonometry' | 'Data Analytics' | 'Advanced Math'

export interface Problem {
  id: string
  title: string | null
  question: string
  type: 'mc' | 'input'
  difficulty: 'easy' | 'medium' | 'hard'
  topic: string | null
  category: ProblemCategory | null
  solution: string
  explanation: string | null
  order_index: number | null
  created_at: string
  choices?: Choice[]
}

export interface Choice {
  id: string
  problem_id: string
  label: 'A' | 'B' | 'C' | 'D'
  choice_text: string
  is_correct: boolean
  order_index: number
}

export interface Exam {
  id: string
  user_id: string
  part: 1 | 2
  score: number
  total: number
  duration_s: number
  taken_at: string
  user?: User
}

export interface ExamAnswer {
  id: string
  exam_id: string
  problem_id: string
  user_answer: string
  is_correct: boolean
  problem?: Problem
}

export interface ProblemAttempt {
  id: string
  user_id: string
  problem_id: string
  is_correct: boolean
  attempted_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  problem_id: string
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  problem_id: string | null
  created_at: string
  sender?: { id: string; name: string | null; email: string }
  receiver?: { id: string; name: string | null; email: string }
  problem?: { id: string; title: string | null; question: string }
}
