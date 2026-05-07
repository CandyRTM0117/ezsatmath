-- Add is_free_problem flag to problems table
alter table problems
  add column if not exists is_free_problem boolean not null default false;

-- Reset any previous selection, then randomly pick exactly 40
update problems set is_free_problem = false;

update problems
set is_free_problem = true
where id in (
  select id from problems order by random() limit 40
);
