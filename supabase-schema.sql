-- ============================================================
-- EzSAT Database Schema + RLS Policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- TABLES

create table if not exists users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  name        text,
  role        text not null default 'student' check (role in ('admin', 'student')),
  created_at  timestamptz not null default now()
);

create table if not exists problems (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  question    text not null,
  type        text not null check (type in ('mc', 'input')),
  difficulty  text not null check (difficulty in ('easy', 'medium', 'hard')),
  topic       text,
  solution    text not null,
  explanation text,
  order_index int,
  created_at  timestamptz not null default now()
);

create table if not exists choices (
  id           uuid primary key default gen_random_uuid(),
  problem_id   uuid not null references problems(id) on delete cascade,
  label        text not null check (label in ('A', 'B', 'C', 'D')),
  choice_text  text not null,
  is_correct   boolean not null default false,
  order_index  int not null default 0
);

create table if not exists exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  part        int not null check (part in (1, 2)),
  score       int not null,
  total       int not null,
  duration_s  int not null,
  taken_at    timestamptz not null default now()
);

create table if not exists exam_answers (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references exams(id) on delete cascade,
  problem_id  uuid not null references problems(id) on delete cascade,
  user_answer text not null default '',
  is_correct  boolean not null
);

create table if not exists problem_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  problem_id   uuid not null references problems(id) on delete cascade,
  is_correct   boolean not null,
  attempted_at timestamptz not null default now()
);

-- INDEXES
create index if not exists idx_problem_attempts_user on problem_attempts(user_id);
create index if not exists idx_problem_attempts_problem on problem_attempts(problem_id);
create index if not exists idx_exams_user on exams(user_id);
create index if not exists idx_exam_answers_exam on exam_answers(exam_id);
create index if not exists idx_choices_problem on choices(problem_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users enable row level security;
alter table problems enable row level security;
alter table choices enable row level security;
alter table exams enable row level security;
alter table exam_answers enable row level security;
alter table problem_attempts enable row level security;

-- Helper: is current user admin?
create or replace function is_admin()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from users where id = auth.uid() and role = 'admin'
  )
$$;

-- USERS table
create policy "users: admin full access" on users
  for all using (is_admin());

create policy "users: student read own" on users
  for select using (id = auth.uid());

create policy "users: student update own name" on users
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'student');

-- PROBLEMS table (read-only for students, full for admins)
create policy "problems: public read" on problems
  for select using (true);

create policy "problems: admin write" on problems
  for all using (is_admin());

-- CHOICES table
create policy "choices: public read" on choices
  for select using (true);

create policy "choices: admin write" on choices
  for all using (is_admin());

-- EXAMS table
create policy "exams: admin full" on exams
  for all using (is_admin());

create policy "exams: student own" on exams
  for all using (user_id = auth.uid());

-- EXAM_ANSWERS table
create policy "exam_answers: admin full" on exam_answers
  for all using (is_admin());

create policy "exam_answers: student own via exam" on exam_answers
  for all using (
    exists (select 1 from exams where exams.id = exam_id and exams.user_id = auth.uid())
  );

-- PROBLEM_ATTEMPTS table
create policy "problem_attempts: admin full" on problem_attempts
  for all using (is_admin());

create policy "problem_attempts: student own" on problem_attempts
  for all using (user_id = auth.uid());

-- ============================================================
-- MIGRATIONS (run after initial schema is applied)
-- ============================================================

-- Add subscription status to users
alter table public.users add column if not exists is_subscribed boolean not null default false;

-- Add category to problems (Algebra, Trigonometry, Data Analytics, Advanced Math)
alter table public.problems add column if not exists category text;

-- ============================================================
-- AUTO-INSERT USER PROFILE ON SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into users (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
