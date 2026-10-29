-- Flow Board: shared team board. Any signed-in (non-anonymous) user can
-- read and change every card; anonymous visitors have no access.

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  assignee text not null check (char_length(assignee) between 1 and 60),
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  due_date date not null,
  column_id text not null default 'backlog'
    check (column_id in ('backlog', 'in-progress', 'in-review', 'done')),
  -- Fractional ordering within a column; lower comes first.
  position double precision not null default 0,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_column_position_idx on public.cards (column_id, position);
create index cards_created_by_idx on public.cards (created_by);

-- Keep updated_at current.
create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cards_set_updated_at
before update on public.cards
for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.cards enable row level security;

create policy "Team members can view cards"
on public.cards for select
to authenticated
using ( ((select auth.jwt()) ->> 'is_anonymous')::boolean is not true );

create policy "Team members can create cards as themselves"
on public.cards for insert
to authenticated
with check (
  ((select auth.jwt()) ->> 'is_anonymous')::boolean is not true
  and created_by = (select auth.uid())
);

create policy "Team members can update cards"
on public.cards for update
to authenticated
using ( ((select auth.jwt()) ->> 'is_anonymous')::boolean is not true )
with check ( ((select auth.jwt()) ->> 'is_anonymous')::boolean is not true );

create policy "Team members can delete cards"
on public.cards for delete
to authenticated
using ( ((select auth.jwt()) ->> 'is_anonymous')::boolean is not true );

-- Data API exposure: new tables are not exposed automatically, so grant
-- explicitly. created_by / timestamps are not client-updatable.
revoke all on public.cards from anon, authenticated;
grant select, delete on public.cards to authenticated;
grant insert (id, title, assignee, priority, due_date, column_id, position, created_by)
  on public.cards to authenticated;
grant update (title, assignee, priority, due_date, column_id, position)
  on public.cards to authenticated;

-- Realtime: broadcast row changes (RLS is applied per subscriber).
alter publication supabase_realtime add table public.cards;
