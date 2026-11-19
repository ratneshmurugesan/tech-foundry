-- Proof A — the cellar RLS proof. Run AS taskflow_app (the bound non-owner role),
-- NOT postgres (superuser + owner bypasses RLS). The app stamps app.current_user_id
-- per request; here we SET it directly to simulate each identity.
\set ON_ERROR_STOP on
\echo '=== Proof A: cellar RLS (connected as taskflow_app) ==='
SELECT current_user AS connected_as;

-- 0) Confirm RLS is armed on all 5 tables: relrowsecurity=on, relforcerowsecurity=off
--    (ENABLE, not FORCE — so postgres bypasses, taskflow_app is bound).
SELECT relname,
       relrowsecurity        AS rls_on,
       relforcerowsecurity   AS rls_force
FROM pg_class
WHERE relname IN ('workspaces','projects','issues','workspace_members','payment_plans')
ORDER BY relname;

-- 1) DOORLESS seeds the fixture (doorless opens everything, so it may INSERT the rows).
SET app.current_user_id = '__doorless__';
INSERT INTO workspaces (id, name) VALUES ('proof_ws_a', 'Proof A') ON CONFLICT DO NOTHING;
INSERT INTO workspaces (id, name) VALUES ('proof_ws_b', 'Proof B') ON CONFLICT DO NOTHING;
INSERT INTO workspace_members (id, workspace_id, user_id, role)
  VALUES ('proof_wm_a', 'proof_ws_a', 'proof_user_a', 'owner')   ON CONFLICT DO NOTHING;
INSERT INTO workspace_members (id, workspace_id, user_id, role)
  VALUES ('proof_wm_b', 'proof_ws_a', 'proof_user_b', 'member')  ON CONFLICT DO NOTHING;
INSERT INTO workspace_members (id, workspace_id, user_id, role)
  VALUES ('proof_wm_c', 'proof_ws_b', 'proof_user_c', 'owner')   ON CONFLICT DO NOTHING;
INSERT INTO projects (id, name, workspace_id)
  VALUES ('proof_prj', 'Proof Project', 'proof_ws_a') ON CONFLICT DO NOTHING;
INSERT INTO issues (id, title, project_id)
  VALUES ('proof_iss', 'Proof Issue', 'proof_prj') ON CONFLICT DO NOTHING;

\echo '--- 2) user_a (OWNER of ws_a): sees ws_a + its members/project/issue; NOT ws_b ---'
SET app.current_user_id = 'proof_user_a';
SELECT 'workspaces' AS t, id FROM workspaces ORDER BY id;
SELECT 'members'    AS t, id, user_id, role FROM workspace_members ORDER BY id;
SELECT 'projects'   AS t, id, name FROM projects ORDER BY id;
SELECT 'issues'     AS t, id, title FROM issues ORDER BY id;

\echo '--- 3) user_b (MEMBER of ws_a): sees ws_a rows; NOT ws_b ---'
SET app.current_user_id = 'proof_user_b';
SELECT 'workspaces' AS t, id FROM workspaces ORDER BY id;
SELECT 'members'    AS t, id, user_id, role FROM workspace_members ORDER BY id;

\echo '--- 4) user_c (OWNER of ws_b only): sees ws_b; NOT ws_a ---'
SET app.current_user_id = 'proof_user_c';
SELECT 'workspaces' AS t, id FROM workspaces ORDER BY id;

\echo '--- 5) UNSET identity (fail-closed): app_uid() is NULL => sees NOTHING ---'
RESET app.current_user_id;
SELECT app_uid() AS uid_should_be_null;
SELECT 'workspaces' AS t, id FROM workspaces ORDER BY id;

\echo '--- 6a) WRITE ALLOW: user_a (owner of ws_a) invites a NEW user into ws_a => 1 row ---'
SET app.current_user_id = 'proof_user_a';
WITH invited AS (
  INSERT INTO workspace_members (id, workspace_id, user_id, role)
  VALUES ('proof_wm_d', 'proof_ws_a', 'proof_user_d', 'member')
  ON CONFLICT (workspace_id, user_id) DO NOTHING
  RETURNING id
)
SELECT COUNT(*) AS rows_inserted_should_be_1 FROM invited;

\echo '--- 6b) WRITE REJECT: user_a (NOT owner of ws_b) tries to add user_c into ws_b => 0 rows ---'
SET app.current_user_id = 'proof_user_a';
DO $$
BEGIN
  INSERT INTO workspace_members (id, workspace_id, user_id, role)
  VALUES ('proof_wm_x', 'proof_ws_b', 'proof_user_c', 'member');
  RAISE NOTICE 'UNEXPECTED: insert SUCCEEDED — the RLS write check FAILED';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'EXPECTED REJECTION: %', SQLERRM;
END $$;

-- 7) Cleanup (doorless opens everything, so it may DELETE the fixture).
SET app.current_user_id = '__doorless__';
DELETE FROM issues            WHERE id = 'proof_iss';
DELETE FROM projects          WHERE id = 'proof_prj';
DELETE FROM workspace_members WHERE id IN ('proof_wm_a','proof_wm_b','proof_wm_c','proof_wm_d');
DELETE FROM workspaces        WHERE id IN ('proof_ws_a','proof_ws_b');
\echo '=== Proof A complete (fixture cleaned up) ==='
