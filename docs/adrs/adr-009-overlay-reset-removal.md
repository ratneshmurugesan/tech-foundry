# ADR-009: Compose-File Overlay Removal Is Done With `!reset`, Never With `~` or `[]`

**Status**: Active
**Date**: 2026-09-11
**Phase**: Phase 1 — Make it Work, Sprint 1, Day 6.5
**Supersedes**: None (amends ADR-006's base/overlay split with its removal semantics; referenced by ADR-008)

## Context

The restaurant on a pallet (ADR-006) ships in two flavors from two files: the dev chart and a prod overlay passed with a second `-f`. The overlay is *supposed* to strip dev-only behavior from the pallet before shipping: the baked-in source mounts, the source-watch dev `command`, the cellar's door (ADR-008).

The committed overlay stripped the dev mounts with `volumes: ~` and *kept* the cellar's lobby tap (`- "127.0.0.1:5432:5432"` — ADR-008's narrower door, which the doorless fix of that day then had to remove). On 2026-09-11, while wiring the real deploy, a clean `docker compose config` of the actual chart returned **exit 1** (`services.postgres.ports must be a array`): the first fix attempt against the base file deleted the port entry, leaving a bare `ports:` key behind — and a bare key parses as `null`. Chasing that revealed two independent failures, settled by a 4-way matrix against the compose-spec and the live compose 5.3 binary:

| overlay spelling | effect on a base `volumes`/`ports` entry |
|---|---|
| `volumes: ~` | **no-op** — base mounts ship unchanged |
| `volumes: []` | **no-op** — base mounts ship unchanged |
| `volumes: !override []` | **no-op** — base mounts ship unchanged |
| `volumes: !reset []` | **removed** — the only spelling that clears the base list |

The compose-spec is the judge, and it is categorical: `ports`, `volumes`, `env_file`, `expose`, `external_links`, `external_networks` are **"unique resources" — merged by *appending*, deduped by key. They never delete.** The only documented removal is the **`!reset`** tag, whose worked example in the spec is literally a `ports:` list cleared by `ports: !reset []` in an override. (`!override`, added in compose v2.24.4, *replaces* a value — but for these unique-resource fields it behaves like an append on the same version; `!reset` is the removal tag.)

The consequence of believing the broken spellings: the prod pallet would have rolled out **with `./ts`, `./py` and `:cached node_modules` host mounts and the cellar door still on** — the exact dev behavior ADR-006 and the baked-image design exist to strip. And because compose validates **each `-f` file in isolation before running overlay logic**, a `null` in even one file kills *both* `up`s before a container starts — which is why the dev doorless fix (ADR-008) had to land in the base file as `ports: []`, not as a commented-out entry.

## Decision

1. **Any base declaration that must not ship to prod is cleared in the overlay with `!reset []`** — `postgres.ports`, `taskflow-ts.volumes`, `taskflow-py.volumes`. Never `~`, never a bare `[]`.
2. **The overlay is a veto, and it says so out loud**: a loud header in `docker-compose.prod.yml` records that it is *permanently* stricter than base — that is the invariant prod must hold — so a dev who sees `!reset []` knows it is contract, not leftover.
3. **Empty-but-valid is the base spelling** for anything the overlay resets in prod: base carries `ports: []` (ADR-008), *not* a commented-out entry. A bare `ports:` with only comments underneath parses as `null`; compose then refuses the base file in isolation (`must be a array`) and **every** `up` fails — dev and prod alike — before the overlay is even applied. The valid "deliberately empty" form is the empty list, written as a value, with the opt-in documented in a comment beside it.
4. **Dev ergonomics stay in the base file, prod safety in the overlay**: a dev who uncomments `127.0.0.1:5432:5432` in *their* base gets a door locally; the prod overlay's `!reset []` keeps prod doorless anyway. The two files never have to agree, only the overlay has to *win*.
5. **Proof is a command, not a comment**: the day-6.5 verification runs `docker compose config` (base, then base+prod), diffs the resolved `volumes`/`ports` per service, and requires exit 0 on both — `!reset` is *shown* clearing base entries, not *assumed*.

## Consequences

**Positive**
- **The pallet is the pallet**: resolved prod config — inspected via `config`, not inferred — carries no `./` source mounts, no `:cached` node_modules mount, no host port. The image *is* the tree, restart is `unless-stopped`, the command is watch-free.
- **`!reset` is the only correct general tool** for a base=dev / overlay=prod shop: it answers the question compose merge semantics never answers — *"how do I remove a base declaration?"* — and ADR-008 is its first in-repo use.
- **The overlay won on every axis**: dev and prod are proven to diverge *safely* (same 8000/8001 surfaces, different mounts/commands/ports/restart) with one verified artifact: the composed `config` output of both files.

**Negative**
- **`!reset` is the least common spelling in the wild**. OSS repos almost never *remove* base state in an overlay; the dominant idiom is the inverted chart — `docker-compose.yaml` = prod, `docker-compose.override.yml` = dev — where removal never happens (Docker auto-loads the override in dev; prod `up` just sets `COMPOSE_FILE`). It has zero source divergence and needs no reset tag — which is why it was the *alternative* considered. We keep base=dev / overlay=prod: one canonical prod `up` command, zero source-file divergence, and `!reset` is spec-documented (compose-spec "Merge and override," `!reset`; `!override` in v2.24.4+), not private magic. The cost we pay: a reader who has never seen the spec's merge table reads `volumes: !reset []` as decoration until the Day 6.5 gate proves it.
- **The overlay is now *load-bearing* for correctness, not just tuning.** A future base edit that adds a dev-only port or mount is silently stripped in prod — a good thing — which also means a careless `!reset` on an *additive* field is a footgun. Rule: reset only fields the prod invariant demands (ports, dev mounts); never a field prod must *add* (env, healthcheck).
- **One more file to keep in two dialects**: base speaks "deliberately empty" (`ports: []` + opt-in comment); overlay speaks "veto" (`!reset []`). Both spellings are right in their files; the ADR exists because neither spelling is *local* enough to explain itself.

**Deprecation/Upgrade**
- The mainstream idiom is the **inverted chart** (above). If the two-file world grows past ~3 overlays or a 3rd flavor appears (staging, CI), revisit: `docker-compose.yaml` (prod) + `docker-compose.override.yaml` (dev) + `COMPOSE_FILE` is the zero-rotation layout; today the veto pattern is smaller and the prod `up` is one stable command, so the inversion is deferred, not denied.
- If compose changes unique-resource merge semantics again (it has before — `!override` arrived in v2.24.4), the Day 6.5 `config` gate is the tripwire: the matrix, not memory, detects it.

## References

- Compose-spec, **v2.4 / "Merge and override"**: *"The following are unique resources: `ports`, `volumes`, `env_file`… `!reset` resets a list to empty before merging"*; worked example `ports: !reset []`. Also: `!override` (v2.24.4+).
- ADR-008 (Postgres ships doorless — the first in-repo `!reset` user), ADR-006 (Docker Compose base/overlay split).
- 2026-09-11 verification matrix, compose v5.3.0 (`docker compose version`): per-spelling effect on base lists — `~`/`[]`/`!override []` no-op, `!reset []` removes (`/tmp/m` run, same day).
- 2026-09-11 real-chart `config` results: base and base+prod both exit 0; resolved prod services carry no `./` mounts, no host port; `postgres` keeps its `postgres_data` named volume (volumes reset is per-service and per-field — `!reset` on `ports` never touches `volumes`).
