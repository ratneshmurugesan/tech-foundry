"""Golden-matrix type-shape assertions — the parity wall (ADR-001) at the type layer.

These are pure unit tests (no cellar, no network) that assert the API type
surface matches across both kitchens. A drift here turns the fast suite red.
"""

from src.types import Workspace, CreateWorkspace, UpdateWorkspace


class TestWorkspaceType:
    def test_plan_tier_defaults_to_free(self):
        ws = Workspace(name="Acme")
        assert ws.plan_tier == "free"

    def test_plan_tier_is_settable(self):
        ws = Workspace(name="Acme", plan_tier="starter")
        assert ws.plan_tier == "starter"

    def test_create_workspace_does_not_accept_plan_tier(self):
        """plan_tier is system-managed (the plan state machine sets it), not user-settable on create."""
        import inspect
        fields = CreateWorkspace.model_fields
        assert "plan_tier" not in fields

    def test_update_workspace_does_not_accept_plan_tier(self):
        """plan_tier transitions via the plan state machine, not a direct PATCH."""
        import inspect
        fields = UpdateWorkspace.model_fields
        assert "plan_tier" not in fields
