# Flow Board

A team Kanban board built with React, TypeScript and Vite, backed by Supabase (Postgres, Auth and Realtime).
Signed-in users share one board, and changes show up live for everyone.

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and publishable key
npm run dev                  # start the dev server
npm run build                # type-check and build for production
npm test                     # run the test suite once (npm run test:watch to re-run on save)
```

## Testing

Vitest with React Testing Library, in jsdom. Tests never touch the real database: `src/test/setup.ts` replaces `src/lib/supabase` with an in-memory fake (`src/test/supabaseMock.ts`) that mirrors the delete RLS rule, and makes `createClient` throw if anything tries to build a real client.

- `src/hooks/useBoard.test.ts`, `src/components/Board.test.tsx`: creating, editing, moving and deleting cards (including the Undo toast)
- `src/components/*.test.tsx`: regression tests for dark mode, accessibility and card ownership
- `tests/static/`: checks on files and config (RLS in the migrations, no secrets shipped, SEO tags and `robots.txt`, colour contrast computed from `src/index.css`)

CI (`.github/workflows/ci.yml`) runs lint, tests and the build on every push and pull request.

## Backend

- Supabase project: `Flowboard` (ref `qjetrjvjzrbhonehjxtt`, us-east-1)
- Schema: `supabase/migrations/` (`create_cards`, `optional_due_date`, `add_on_hold_column`, `harden_cards`)
  - `public.cards` table with check constraints on priority, column, field lengths and a finite `position`
  - Row Level Security: signed-in, non-anonymous users can read, create, edit and move any card, but only a card's creator can delete it. Signed-out and anonymous visitors get nothing.
  - Clients cannot change `created_by`, `updated_by` or the timestamps. `updated_by` records who last changed a card.
  - Public sign-ups are disabled; an admin invites users from the Supabase dashboard.
  - The table is in the `supabase_realtime` publication, so changes are pushed to every signed-in client.
- Types: `src/lib/database.types.ts` (regenerate after schema changes)

## Structure

- `src/types.ts`: card and column types, plus the column list
- `src/lib/supabase.ts`: Supabase client
- `src/hooks/useAuth.ts`: current session
- `src/hooks/useBoard.ts`: loads cards, subscribes to live changes, and writes changes optimistically
- `src/components/AuthForm.tsx`: sign-in form (accounts are invite-only)
- `src/components/Board.tsx`: page layout, header and modal state
- `src/components/Column.tsx`: a column and its drop target
- `src/components/Card.tsx`: a draggable card
- `src/components/CardModal.tsx`: the add/edit form
