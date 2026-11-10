# Day 18 (2026-11-10) — board drag + issue create/edit + the web's first tests

**Built** (the web kitchen):
- **Board drag** (dnd-kit): open↔closed drag with optimistic status PATCH + rollback on failure. Closes the "roadmap day 19-20 remainder" row.
- **Issue create/edit modals**: Cmd+N opens a create modal (title + status); clicking an issue opens the same form pre-filled for edit. Both POST/PATCH via the existing API client.
- **Vitest + jsdom + Testing Library** test infra (`vitest.config.ts`, `src/test/setup.ts`): 10 tests covering board rendering, drag, create, edit, and error paths. The web kitchen's first test suite.

**Decided**: dnd-kit over native HTML5 drag (the roadmap offered both; dnd-kit gives accessibility + touch for free). Vitest over Jest (the web kitchen already uses Vite; vitest is the zero-config match).

**Debt**: 17a (checkout modal close button) still open — not touched today.

**Next owed to**: Full-stack deploy (roadmap day 25-26) — single URL, reverse proxy, $0 VM.
