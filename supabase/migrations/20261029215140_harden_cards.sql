-- Only a card's creator can delete it; everyone on the team can still view, edit and move cards.
drop policy "Team members can delete cards" on public.cards;

create policy "Creators can delete their own cards"
on public.cards for delete
to authenticated
using (
  ((select auth.jwt()) ->> 'is_anonymous')::boolean is not true
  and created_by = (select auth.uid())
);

-- Audit: who last changed each card. Set by the server only; clients have no
-- insert/update grant on this column.
alter table public.cards
  add column updated_by uuid default auth.uid() references auth.users (id) on delete set null;

update public.cards set updated_by = created_by where updated_by is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

-- Reject NaN and ±Infinity positions, which would break ordering for everyone
-- (NaN fails BETWEEN in Postgres).
alter table public.cards add constraint cards_position_finite
  check (position between -1e15 and 1e15);
