# smoke_tests/

Fast, shallow, end-to-end checks that run *against the live dev servers* and assert "it does the right thing and never breaks" — status codes, error-contract shapes, cascade behavior. No test framework, no fixtures beyond curl + jq. This is the smoke layer; the structured test suite (Vitest / pytest) is a Phase 2 concern and lives elsewhere.

## When to add one

At your **daily closeout**, *if* the day produced something observable over HTTP that should never regress:

- a new endpoint group or error path (→ a new file), or
- a fix to existing behavior your current script doesn't assert (→ extend in place, same file).

Days that only touched internals (ids, repositories, types, docker wiring with no behavior change) owe **no** script — don't manufacture coverage.

## Naming

```
smoke_test_day_<NN>-<slug>.sh    # new file for a new behavior area
```

- `NN` = the day number, zero-padded (`day_01`, `day_02`, …). Never reuse a day number, even if you redo it.
- `slug` = the behavior area, kebab-case: `smoke_test_day_04-error-contract.sh`, `smoke_test_day_05-containerization.sh`.
- A day that touches an *existing* area → add its checks to the older file, don't create a duplicate.

## Anatomy

Every smoke test is a self-contained POSIX/zsh script that:

1. Declares its `*_BASE` URLs with the standard defaults — TS `http://localhost:8000`, PY `http://localhost:8001` — overridable via positional or env args (see the day-04 script header for the current shape).
2. Runs checks that print `PASS`/`FAIL <label> → expected vs got` per assertion.
3. **Runs every check against BOTH tracks** (the ADR-001 parity mandate: the contract only means something if `:8000` and `:8001` agree).
4. Ends with a tally and exits **non-zero on any FAIL** (so it can gate a commit or a container build later).
5. Cleans up after itself; at worst leaves a few test rows in the DB (it's a dev database).

Reference: [`smoke_test_day_04-error-contract.sh`](./smoke_test_day_04-error-contract.sh) is the house style — `http()` helper with `FULLBODY`/`BODY` split, `require()` assertions, per-server `run_check_suite()`.

## Copying a new one

```sh
cp smoke_test_day_04-error-contract.sh smoke_test_day_05-containerization.sh
# rewrite the check block, keep the harness
zsh apps/taskflow/smoke_tests/smoke_test_day_05-containerization.sh
```

## Recording results

The daily note records the final tally ("26/26 both servers") in its closeout section, same as the day-04 note does. The script is the durable artifact; the note is the receipt.
