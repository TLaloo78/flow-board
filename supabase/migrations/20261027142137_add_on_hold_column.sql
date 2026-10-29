-- Add an "On Hold" column between In Review and Done.
alter table public.cards drop constraint cards_column_id_check;
alter table public.cards add constraint cards_column_id_check
  check (column_id in ('backlog', 'in-progress', 'in-review', 'on-hold', 'done'));
