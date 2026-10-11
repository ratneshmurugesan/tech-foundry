"""Golden-matrix shape assertions — the parity wall (ADR-001).

Pure unit tests (no cellar, no network). Both kitchens (PY pydantic / TS zod) must agree on
the *same* shape facts; a drift in one turns the fast suite red. Two layers:

- **Type layer** (`TestWorkspaceType`): the model's field defaults, and the create/update
  field set (plan_tier is system-managed, never client-settable).
- **Wire layer** (`TestWireShape`): the *serialized* response — the field SET + ORDER that
  hits the client. This is the half the TS zod serializer used to silently break (it stripped
  `created_at` / `plan_tier`); now both kitchens assert the same shape, so a drift turns the
  fast suite red instead of shipping two different JSON bodies. The TS twin lives in
  `ts/tests/types.test.ts` and asserts the identical ordered key lists.
"""

from datetime import datetime

from src.types import (
    Workspace, Project, Issue, WorkspaceMember,
    CreateWorkspace, UpdateWorkspace,
)

# A fixed instant + ids so both kitchens assert on the *same* fixture (the golden matrix's
# "shared fixture"). The values are arbitrary — what's asserted is the SHAPE (key set + order
# + enums), not the values, because the two kitchens read different databases.
FIXED_TS = datetime(2026, 10, 10, 12, 34, 56, 789012)
# RFC 4122 v4 UUIDs (version nibble 4, variant a) — the same shared fixture the TS twin uses.
WS_ID = "123e4567-e89b-42d3-a456-426614174000"
PRJ_ID = "223e4567-e89b-42d3-a456-426614174001"
ISS_ID = "323e4567-e89b-42d3-a456-426614174002"
MEM_ID = "423e4567-e89b-42d3-a456-426614174003"
USER_ID = "523e4567-e89b-42d3-a456-426614174004"


class TestWorkspaceType:
    def test_plan_tier_defaults_to_free(self):
        ws = Workspace(name="Acme")
        assert ws.plan_tier == "free"

    def test_plan_tier_is_settable(self):
        ws = Workspace(name="Acme", plan_tier="starter")
        assert ws.plan_tier == "starter"

    def test_create_workspace_does_not_accept_plan_tier(self):
        """plan_tier is system-managed (the plan state machine sets it), not user-settable on create."""
        fields = CreateWorkspace.model_fields
        assert "plan_tier" not in fields

    def test_update_workspace_does_not_accept_plan_tier(self):
        """plan_tier transitions via the plan state machine, not a direct PATCH."""
        fields = UpdateWorkspace.model_fields
        assert "plan_tier" not in fields


class TestWireShape:
    """The serialized response shape — must be identical across both kitchens.

    `model_dump(mode="json")` is what FastAPI puts on the wire; we assert the ordered key
    list (set + order) and the enum values. The TS twin asserts the same ordered key list
    through the zod response schema, so a drift in either kitchen turns the suite red.
    """

    def test_workspace_wire_shape(self):
        ws = Workspace(id=WS_ID, name="Acme", plan_tier="free", created_at=FIXED_TS)
        dumped = ws.model_dump(mode="json")
        assert list(dumped.keys()) == ["id", "name", "plan_tier", "created_at"]
        assert dumped["plan_tier"] == "free"

    def test_project_wire_shape(self):
        prj = Project(id=PRJ_ID, name="Proj", created_at=FIXED_TS, workspace_id=WS_ID)
        dumped = prj.model_dump(mode="json")
        assert list(dumped.keys()) == ["id", "name", "created_at", "workspace_id"]

    def test_issue_wire_shape(self):
        iss = Issue(id=ISS_ID, project_id=PRJ_ID, title="Fix bug", status="open", created_at=FIXED_TS)
        dumped = iss.model_dump(mode="json")
        assert list(dumped.keys()) == ["id", "project_id", "title", "status", "created_at"]
        assert dumped["status"] == "open"

    def test_workspace_member_wire_shape(self):
        """The member has NO `created_at` on the wire in EITHER kitchen — assert it stays that way."""
        mem = WorkspaceMember(id=MEM_ID, workspace_id=WS_ID, user_id=USER_ID, role="owner")
        dumped = mem.model_dump(mode="json")
        assert list(dumped.keys()) == ["id", "workspace_id", "user_id", "role"]
        assert "created_at" not in dumped
        assert dumped["role"] == "owner"
