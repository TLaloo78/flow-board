-- Due dates are optional; a card without one is never overdue.
alter table public.cards alter column due_date drop not null;
