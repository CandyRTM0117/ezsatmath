create table if not exists email_logs (
  id        uuid primary key default gen_random_uuid(),
  email     text not null,
  type      text not null,  -- 'confirmation', 'password_reset', 'magic_link', 'email_change', etc.
  sent_at   timestamptz not null default now(),
  status    text not null default 'sent'
);

-- Only admins can read; no direct client writes (service role only)
alter table email_logs enable row level security;

create policy "admins can read email_logs" on email_logs
  for select using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );
