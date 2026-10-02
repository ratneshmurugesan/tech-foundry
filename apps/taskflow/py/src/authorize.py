import os
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware

from typing import Awaitable, Callable
from .constants import PUBLIC_PATHS
from .errors import ForbiddenError
from .types import ROLE_RANK, WorkspaceMember
from .models import ProjectModel, IssueModel, WorkspaceMemberModel
from . import db
from .repository import PostgresRepository

repo = PostgresRepository()

# The two 403 strings of the day's contract (ADR-007 resident, mirroring ADR-011's six-string discipline).
# Fixed strings on purpose: parity (8000 == 8001) requires the *same* message on both kitchens.
NOT_A_MEMBER = "Not a member of this workspace"
REQUIRES_OWNER = "Requires the owner role"

def _forbidden(message: str) -> JSONResponse:
    return JSONResponse(status_code=403,
        content={"statusCode": 403, "error": "Forbidden", "message": message})

async def assert_role(
    workspace_id: str | None, sub: str | None, min_role: str,
    find_membership: Callable[[str, str], Awaitable[WorkspaceMember | None]],
) -> None:
    """The *entire* permission decision of the day, as a pure function.  No request object, no HTTP, no
    session of its own:  the caller passes the one membership read (a coroutine taking
    (workspace_id, user_id) and returning the row, if any).  Two 403 shapes are the whole
    output contract of the function.  This is the unit-test seam of the middleware below — tests stub
    find_membership and get the ladder, cellars apart."""
    if sub is None or workspace_id is None:
        raise ForbiddenError(NOT_A_MEMBER)
    row = await find_membership(workspace_id, sub)
    role = row.role if row and row.role in ROLE_RANK else None
    if role is None:
        raise ForbiddenError(NOT_A_MEMBER)
    if ROLE_RANK[role] < ROLE_RANK[min_role]:
        raise ForbiddenError(REQUIRES_OWNER)

def _min_role_for(method: str, path: str) -> str | None:
    parts = [p for p in path.split("/") if p]
    if not parts:
        return None
    if parts[0] == "workspaces":
        if len(parts) <= 1:
            return None                          # GET list / POST create (creator-minted)
        if len(parts) == 2:
            return "member" if method == "GET" else "owner"
        if len(parts) == 3 and parts[2] == "members":
            return "owner" if method == "POST" else "member"
        return None
    if parts[0] in ("projects", "issues"):
        # item routes only; CREATE routes stay ungated here (workspace lives in the body)
        return "owner" if method in ("PATCH", "DELETE") else (
            "member" if len(parts) == 2 else None)
    return None

def _sub(request: Request) -> str | None:
    user = getattr(request.state, "user", None)   # doorless → attr never set → None
    return user.get("sub") if user else None

class AuthorizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not os.environ.get("AUTH0_DOMAIN") or request.url.path in PUBLIC_PATHS:
            return await call_next(request)      # doorless-auth or a public path

        min_role = _min_role_for(request.method, request.url.path)
        if min_role is None:
            return await call_next(request)

        user = getattr(request.state, "user", None)   # set by AuthenticateBadgeMiddleware
        sub = user.get("sub") if user else None

        ws_id = await self._workspace_id_for(request)
        try:
            await assert_role(ws_id, sub, min_role, repo.find_membership)
        except ForbiddenError as e:
            return _forbidden(e.message)
        return await call_next(request)

    async def _workspace_id_for(self, request: Request) -> str | None:
        parts = [p for p in request.url.path.split("/") if p]
        if parts and parts[0] == "workspaces" and len(parts) > 1:
            return parts[1]
        if parts and parts[0] in ("projects", "issues") and len(parts) == 2:
            # walk the FK chain — projects/issues have no keys of their own
            session = await db.get_session()
            try:
                if parts[0] == "projects":
                    row = (await session.execute(
                        select(ProjectModel.workspace_id)
                        .where(ProjectModel.id == parts[1]))).scalar_one_or_none()
                else:
                    row = (await session.execute(
                        select(ProjectModel.workspace_id)
                        .join(IssueModel, IssueModel.project_id == ProjectModel.id)
                        .where(IssueModel.id == parts[1]))).scalar_one_or_none()
                return row
            finally:
                await session.close()
        return None