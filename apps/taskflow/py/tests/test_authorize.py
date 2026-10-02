"""
The day-10 authorizer's unit suite — the ADR-010 payoff: pure-function tests that stub
the one membership read, so they pass *cellar-less and doorless* in CI (no JWKS, no
Postgres, no live badge).  The four cases are the full ladder of the day:

    no row                  -> 403  "Not a member of this workspace"
    member,  min=member     -> pass
    member,  min=owner      -> 403  "Requires the owner role"
    owner,   min=owner      -> pass
    owner,   min=member     -> pass   (rank 2 >= 1 — the ladder, not string equality)
    sub=None (no badge)     -> 403  "Not a member of this workspace"
    workspace_id=None (no room) -> 403  "Not a member of this workspace"

Parity:  the TS kitchen's sibling suite feeds the same six states through
authorizeRole(...) and asserts the same two message strings (8000 == 8001).
"""

import pytest

from src.authorize import assert_role
from src.errors import ForbiddenError
from src.types import WorkspaceMember


def _member(role: str) -> WorkspaceMember:
    return WorkspaceMember(id="m-1", workspace_id="w-1", user_id="u-1", role=role)


async def _always_none(ws_id: str, user_id: str):
    return None
async def _as_member(ws_id: str, user_id: str):
    return _member("member")
async def _as_owner(ws_id: str, user_id: str):
    return _member("owner")


WS, SUB = "w-1", "u-1"


@pytest.mark.parametrize(
    ("find_membership", "min_role", "expected"),
    [
        (_always_none, "member", "Not a member of this workspace"),
        (_as_member, "member", None),
        (_as_member, "owner",  "Requires the owner role"),
        (_as_owner,  "owner",  None),
    ],
)
@pytest.mark.asyncio
async def test_ladder(find_membership, min_role, expected):
    if expected is None:
        await assert_role(WS, SUB, min_role, find_membership)  # must not raise
    else:
        with pytest.raises(ForbiddenError) as exc_info:
            await assert_role(WS, SUB, min_role, find_membership)
        assert exc_info.value.message == expected


@pytest.mark.asyncio
async def test_no_badge_is_not_a_member():
    """A request that reached the authorizer with no sub (the *only* way that happens if
    the door is *configured* but the badge is absent — doorless vanishes first)
    is treated exactly like a stranger:  not a member, not allowed."""
    with pytest.raises(ForbiddenError) as exc_info:
        await assert_role(WS, None, "member", _as_member)
    assert exc_info.value.message == "Not a member of this workspace"


@pytest.mark.asyncio
async def test_no_workspace_is_not_a_member():
    """A route with no room to resolve to (a bare /projects list under the configured
    door) has nothing to check membership *against* — same shape, same string."""
    with pytest.raises(ForbiddenError) as exc_info:
        await assert_role(None, SUB, "member", _as_member)
    assert exc_info.value.message == "Not a member of this workspace"


@pytest.mark.asyncio
async def test_bad_role_value_is_not_a_member():
    """A row whose role is not on the ladder (a future role the schema's CHECK
    does not yet allow) is treated as 'no usable role' — not allowed, the safe
    shape, never a silent pass."""
    async def _weird(ws_id: str, user_id: str):
        # Simulates a stale/legacy role that reached the app *despite* the schema's
        # CHECK (a role added in a future migration, or a row written before the
        # constraint existed).  model_construct bypasses Pydantic's literal check —
        # exactly the shape the pure function must survive: any role *not in
        # ROLE_RANK* falls out to None -> Not a member, the safe shape.
        return WorkspaceMember.model_construct(
            id="m-1", workspace_id="w-1", user_id="u-1", role="admin")
    with pytest.raises(ForbiddenError) as exc_info:
        await assert_role(WS, SUB, "member", _weird)
    assert exc_info.value.message == "Not a member of this workspace"
