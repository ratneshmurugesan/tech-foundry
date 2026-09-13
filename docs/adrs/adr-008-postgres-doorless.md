# ADR-008: Postgres Ships Doorless — No Host Port Binding at All

**Status**: Active
**Date**: 2026-09-11
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 6
**Supersedes**: None (amends ADR-006's dev chart: that ADR stays Active — only the port policy changed)

## Context

The restaurant's cellar (Postgres) had a door punched through to the outside world: the dev chart's `postgres.ports: - "5432:5432"`, with *no* `127.0.0.1` pin — a door open to the whole street, not just the lobby. The prod overlay narrowed it to `- "127.0.0.1:5432:5432"`: still a door, now only on the lobby wall.

Two things made that narrower door unacceptable:

1. **The 2026-09-11 deploy.** The production `up` died *before any container started* because something else on the box already owned port 5432. The cellar's door was a **hidden load-bearing dependency**: the app containers never touch it — they reach the cellar by service name (`postgres:5432`) over the internal compose network, exactly as `DATABASE_URL` always said. A port that no runtime consumer uses cannot fail a request, but it can fail the *whole building* on port collision. That is precisely what happened.
2. **The 5432 fiddling of 2026-09-10** (`dbbd416`, `dfe61b0`) was this same bug wearing a disguise: renaming the door 5432→5433→5434 to dodge a collision instead of asking whether the door existed for a reason. `127.0.0.1`-pinning narrows the blast radius (the street can't see in) but it *still binds 5432*, so the collision — and with it, a dead `up` — survives. Pinning was a bandage; the wound was the binding.
3. Dev ergonomics: the door's only real customer was a human at a terminal running `psql localhost:5432`.

**Alternatives considered** (and why each failed the test):

- *`127.0.0.1:5432` (lobby-wall door)* — still binds a port; `up` still dies when anything else owns it. The 2026-09-11 incident is the proof of this failure.
- *`5433`/`5434` (renumber the door)* — dodges *today's* collision; invites the next one, and trains the next person to fiddle numbers instead of asking questions. The 2026-09-10 episode (`dbbd416`, `dfe61b0`) is the proof.
- *`expose: ["5432"]` (a hatch on the back wall)* — technically correct (reaches only the internal net) but *cosmetically wrong*: it lies. A reader glances at an `expose` line and files it under "internal-only," but it is a *port declaration* too, and in a base/overlay world it would still need to be removed by the prod overlay — the very mechanism `!reset` exists for (ADR-009). `ports: []` is the honest, self-documenting "there is no door."
- *Keep the door, pin to `localhost`* — see option 1; same root failure.

## Decision

1. **Base (dev) chart: `postgres.ports: []`** — deliberately empty. Not `ports:`-with-comments (that parses as `null` and compose refuses the *base file itself* with `services.postgres.ports must be a array`, before the overlay is even read); not absent-but-guessed. An explicit empty list is the only valid "no door" spelling.
2. **Prod overlay: `postgres.ports: !reset []`** — the compose-spec tag that *clears* the base list (ADR-009), so prod is doorless **even if a dev later re-adds a host port to the base file** for their own convenience. Without `!reset`, an overlay list would merely *append* (compose merge semantics), and the base door would sail right into production.
3. **Manual access is now a deliberate verb, not an accidental side effect.** Dev: `docker compose exec postgres psql -U postgres` (in-container) or an SSH tunnel to the box. There is no door left to walk through; there is a work order to file.
4. **No `expose` line** — it would buy the correct behavior with a misleading document. The self-explanatory `ports: []` + comment *is* the documentation.

## Consequences

**Positive**
- The cellar can no longer crash the building: `up` no longer depends on a host port being free, on *either* machine — the class of failure that killed the 2026-09-11 deploy (and would have killed the next one) is structurally gone.
- One less number to babysit: no 5432 to pin, renumber, or argue about, in dev *or* prod. The next collision of 5432 on some machine — and it will happen, on someone's laptop, with their native Postgres — is now nobody's compose problem.
- The overlay became *stronger than the base* for security posture: prod is provably doorless (ADR-009's `!reset`), independent of what any dev uncomments in their local base file. Prod can only be *tighter* than dev, never looser by accident.

**Negative**
- **Convenience tax on a common debugging reflex**: `psql localhost:5432` from the terminal now means `docker compose exec postgres psql -U postgres` — one more keystroke, and a mental model bump for anyone whose muscle memory points at 5432.
- **Documentation must do the work the door used to do**: the *how-to-see-your-data* procedure lives in a YAML comment and (after this ADR) the Day 6 note. If it gets lost, a dev hits "connection refused" and reaches *back* for a port mapping — the exact door we bricked up. Mitigation: the `exec` one-liner lives in the base file's comment block, next to where the door used to be, so the temptation and its replacement sit side by side.
- **A prod overlay that clears base state is a new contract** (ADR-009): the overlay is no longer purely additive. Anyone reading the base file alone will believe ports are decided in base; the overlay can veto them. The overlay file carries a loud header saying so.

**Deprecation/Upgrade**
- If a future service genuinely needs a *deliberate* host port (a web frontend on `8000`), it declares it in base and, if it must die in prod, gets an explicit `ports: !reset []` in this overlay — the doorless-vs-doored distinction becomes per-service and visible line by line.
- **The DB *pushed* by a prior schema version survives** (ADR-006: the `postgres_data` named volume): a doorless cellar still keeps its cellar — `postgres_data:/var/lib/postgresql/data`; `!reset []` touches ports only, never volumes. `docker compose down` (no `-v`) preserves data across redeploys — a fact verified as a *Gate* of the Day 6 deploy, not assumed.

## References

- 2026-09-11 production deploy on the Foundry box: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` failing at `port is already allocated for '0.0.0.0:5432'` — the incident this ADR exists for.
- 2026-09-10 5432→5433→5434 renumber incident (`dbbd416`, `dfe61b0`) — collision-dodging recorded here; it has no note of its own.
- ADR-006 (Docker Compose dev environment), ADR-009 (Compose-overlay removal semantics: `!reset`).
- Compose v2 reference: `ports`, `expose`, and multi-file `!reset` / `!override` tags.
