-- (idempotent; run as the `postgres` superuser, e.g. a one-shot `cellar-setup` service)

\set ON_ERROR_STOP on   -- load-bearing: a plain `psql -f` swallows errors and exits 0,
                         -- so compose would believe cellar-setup "succeeded" with NO policies
                         -- armed. With this, any failing statement aborts the script => non-zero
                         -- exit => the apps never start against a half-locked cellar.

-- 1) The app role: NOT superuser, NOT the table owner => RLS applies to it.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'taskflow_app') THEN
    CREATE ROLE taskflow_app LOGIN;
  END IF;
  -- The app authenticates over TCP with a password (the compose DATABASE_URL carries it).
  -- Always set it (idempotent) so a role left over from an earlier run still has one.
  ALTER ROLE taskflow_app WITH LOGIN PASSWORD 'postgres';
END $$;

-- DML only (no DDL — db-push/init own the schema). No sequences: IDs are app-generated.
GRANT USAGE ON SCHEMA public TO taskflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  workspaces, projects, issues, workspace_members, payment_plans TO taskflow_app;

-- 2) Identity helpers. SECURITY DEFINER (owner = postgres, a superuser) so the inner
--    reads of workspace_members / projects BYPASS RLS => no recursion, and fast.
CREATE OR REPLACE FUNCTION app_uid() RETURNS TEXT
  LANGUAGE sql STABLE AS
  $$ SELECT current_setting('app.current_user_id', true) $$;          -- NULL if unset (fail-closed)

-- NOTE: all ID columns are TEXT (ULID strings, ADR-003), NOT native uuid — the helper
--       params must be TEXT to match, or `text = uuid` has no operator and the CREATE fails.
CREATE OR REPLACE FUNCTION is_member_of(ws TEXT) RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER AS
  $$ SELECT EXISTS (SELECT 1 FROM workspace_members m
                    WHERE m.workspace_id = ws AND m.user_id = app_uid()) $$;

CREATE OR REPLACE FUNCTION is_owner_of(ws TEXT) RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER AS
  $$ SELECT EXISTS (SELECT 1 FROM workspace_members m
                    WHERE m.workspace_id = ws AND m.user_id = app_uid() AND m.role = 'owner') $$;

CREATE OR REPLACE FUNCTION ws_of_issue(i TEXT) RETURNS TEXT
  LANGUAGE sql STABLE SECURITY DEFINER AS
  $$ SELECT p.workspace_id
     FROM issues iss JOIN projects p ON p.id = iss.project_id
     WHERE iss.id = i $$;                                             -- nullable

-- 3) The five policies. DOORLESS = '__doorless__' opens everything (doorless dev,
--    the webhook, and the create-bootstrap — see Step 4). Otherwise: your rows only.
--    (DROP first so re-runs are idempotent.)

-- workspaces: see/touch a workspace iff you're a member of it (or doorless).
DROP POLICY IF EXISTS ws_isolation ON workspaces;
CREATE POLICY ws_isolation ON workspaces
  USING      (app_uid() = '__doorless__' OR is_member_of(workspaces.id))
  WITH CHECK (app_uid() = '__doorless__' OR is_member_of(workspaces.id));

-- workspace_members: READ = any member of the ws sees all its members (GET members is
--   a member-role route); WRITE = an owner (invites) or your own row.
DROP POLICY IF EXISTS wm_isolation ON workspace_members;
CREATE POLICY wm_isolation ON workspace_members
  USING      (app_uid() = '__doorless__' OR is_member_of(workspace_members.workspace_id))
  WITH CHECK (app_uid() = '__doorless__'
              OR workspace_members.user_id = app_uid()
              OR is_owner_of(workspace_members.workspace_id));

-- projects: via the project's own workspace.
DROP POLICY IF EXISTS prj_isolation ON projects;
CREATE POLICY prj_isolation ON projects
  USING      (app_uid() = '__doorless__' OR is_member_of(projects.workspace_id))
  WITH CHECK (app_uid() = '__doorless__' OR is_member_of(projects.workspace_id));

-- issues: via the issue's project's workspace.
DROP POLICY IF EXISTS iss_isolation ON issues;
CREATE POLICY iss_isolation ON issues
  USING      (app_uid() = '__doorless__' OR is_member_of(ws_of_issue(issues.id)))
  WITH CHECK (app_uid() = '__doorless__' OR is_member_of(ws_of_issue(issues.id)));

-- payment_plans: via the plan's workspace (the webhook runs doorless => open).
DROP POLICY IF EXISTS plan_isolation ON payment_plans;
CREATE POLICY plan_isolation ON payment_plans
  USING      (app_uid() = '__doorless__' OR is_member_of(payment_plans.workspace_id))
  WITH CHECK (app_uid() = '__doorless__' OR is_member_of(payment_plans.workspace_id));

-- 4) ARM the locks. CREATE POLICY does NOT enable RLS — you must flip each table's
--    relrowsecurity flag on, or the policies are inert and every role (incl.
--    taskflow_app) still sees every row. ENABLE (not FORCE) is deliberate: it binds
--    everyone EXCEPT the table owner, so postgres (superuser + owner) still bypasses
--    for db-push/init/admin, while taskflow_app (a non-owner) is bound. Idempotent.
ALTER TABLE workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans     ENABLE ROW LEVEL SECURITY;

-- NOTE: do NOT `ALTER TABLE … FORCE ROW LEVEL SECURITY`. We WANT postgres (superuser,
-- the table owner) to bypass RLS for db-push/init/admin. taskflow_app is neither, so it's bound.