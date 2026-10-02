from fastapi import FastAPI, Path, Request
from fastapi.responses import Response
from typing import List
from contextlib import asynccontextmanager

from .repository import PostgresRepository
from .types import Workspace, CreateWorkspace, UpdateWorkspace, Project,  CreateProject, UpdateProject, Issue, CreateIssue, UpdateIssue, WorkspaceMember, CreateWorkspaceMember
from .error_handlers import register_error_handlers
from .errors import DatabaseCrashError, ConflictError, NotFoundError
from .auth import AuthenticateBadgeMiddleware
from .authorize import AuthorizeMiddleware, _sub

__all__ = ["app"]

@asynccontextmanager
async def lifespan (app: FastAPI):
    from .db import init_db
    await init_db()
    print("Application is starting up...")
    print("Taskflow API running on port 8001")
    yield
    print("Application is shutting down...")

app = FastAPI(title="Taskflow API - Day 3 with PostgreSQL", lifespan=lifespan)

app.add_middleware(AuthorizeMiddleware)
app.add_middleware(AuthenticateBadgeMiddleware)

register_error_handlers(app)

repo = PostgresRepository()

@app.get("/", status_code=200)
async def get_root():
    try:
        return {"status": "ok", "service": "taskflow-py"}
    except Exception as db_error:
            raise DatabaseCrashError(db_error)

@app.get("/workspaces", status_code=200)
async def get_workspaces(request: Request) -> List[Workspace]:
    sub = _sub(request)
    try:
        data = await repo.find_workspaces_for(sub)
        return data
    except Exception as db_error:
        raise DatabaseCrashError(db_error)
@app.post("/workspaces", response_model=Workspace, status_code=201)
async def create_workspaces(body: CreateWorkspace, request: Request):
    sub = _sub(request)
    # if(sub == None):
    #     raise ForbiddenError("Not a member of this workspace")

    # existing_ws_member: WorkspaceMember = await repo.find_membership(id, sub)
    # if(existing_ws_member.role != "owner"):
    #         raise ForbiddenError("Requires the owner role")

    try:
        # Creator is minted as owner in ONE transaction (sub-atomic) — no orphan-creator window.
        if sub is not None:
            return await repo.save_workspace_with_owner(body.name, sub)
        return await repo.save_workspace(body.name)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)
@app.get("/workspaces/{id}", response_model=Workspace, status_code=200)
async def get_workspaces(id: str, request: Request) -> Workspace:
    sub = _sub(request)
    # if(sub == None):
    #     raise ForbiddenError("Not a member of this workspace")

    existing_ws: Workspace
    try:
        existing_ws = await repo.find_workspace_id_for(id, sub)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not existing_ws:
        raise NotFoundError(f"Workspace with ID {id} does not exist")

    return existing_ws
@app.patch("/workspaces/{id}", response_model=Workspace, status_code=200)
async def patch_workspaces(id: str, body: UpdateWorkspace, request: Request)-> Workspace:
    sub = _sub(request)
    # if(sub == None):
    #     raise ForbiddenError("Not a member of this workspace")

    # existing_ws_member: WorkspaceMember = await repo.find_membership(id, sub)
    # if(existing_ws_member.role != "owner"):
    #         raise ForbiddenError("Requires the owner role")
        
    existing_ws: Workspace
    try:
        existing_ws = await repo.find_workspace_id_for(id, sub)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not existing_ws:
        raise NotFoundError(f"Workspace with ID {id} does not exist")

    # Extract ONLY fields explicitly sent in the HTTP request payload
    update_ws = await repo.update_workspace(id, body.model_dump(exclude_unset=True))
    return update_ws
@app.delete("/workspaces/{id}", status_code=204)
async def delete_workspaces(request: Request, id: str = Path(..., description="The ID of item")):
    # sub = _sub(request)
    # if(sub == None):
    #     raise ForbiddenError("Not a member of this workspace")

    # existing_ws_member: WorkspaceMember = await repo.find_membership(id, sub)
    # if(existing_ws_member.role != "owner"):
    #         raise ForbiddenError("Requires the owner role")

    existing_ws: Workspace
    try:
        existing_ws = await repo.find_workspace_by_id(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not existing_ws:
        raise NotFoundError(f"Workspace with ID {id} does not exist")

    try:
        await repo.delete_workspace(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)
    return Response(status_code=204)
@app.post("/workspaces/{id}/members", status_code=201)
async def invite_member(id: str, body: CreateWorkspaceMember, request: Request):
    # sub = _sub(request)
    # if(sub is None):
    #     raise ForbiddenError("Not a member of this workspace")

    # existing_ws_member: WorkspaceMember = await repo.find_membership(id, sub)
    # if(existing_ws_member.role != "owner"):
    #         raise ForbiddenError("Requires the owner role")

    try:
        existing: WorkspaceMember | None = await repo.find_membership(id, body.user_id)
        if existing is not None:
            raise ConflictError(f"User {existing.user_id} is already a member of this workspace")
        return await repo.invite_member(
            CreateWorkspaceMember(
                workspace_id=id,
                user_id=body.user_id,
                role=body.role
            )
        )
    except Exception as db_error:
        raise DatabaseCrashError(db_error)
@app.get("/workspaces/{id}/members", status_code=200)
async def get_members(id: str, request: Request) -> List[WorkspaceMember]:
    # sub = _sub(request)
    existing_ws_members: List[WorkspaceMember]
    try:
        existing_ws_members = await repo.find_members_for(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    # An empty list is 200 [] — an empty collection, not a missing one.
    # Only a workspace that does NOT exist is a 404.
    if not existing_ws_members:
        existing_workspace = await repo.find_workspace_by_id(id)
        if not existing_workspace:
            raise NotFoundError(f"Workspace with ID {id} does not exist")

    return existing_ws_members

    
@app.get("/projects")
async def get_projects(request: Request) -> List[Project]:
    sub = _sub(request)
    try:
        data = await repo.find_projects_for(sub)
        return data
    except Exception as db_error:
        raise DatabaseCrashError(db_error)
@app.post("/projects", response_model=Project, status_code=201)
async def create_projects(body: CreateProject) -> Project:
    existing_ws: Workspace
    try:
        existing_ws = await repo.find_workspace_by_id(body.workspace_id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not existing_ws:
         raise NotFoundError(f"Workspace with ID {body.workspace_id} does not exist")

    new_project: Project
    try:
        new_project = await repo.save_project(workspace_id=body.workspace_id, name=body.name)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    return new_project
@app.get("/projects/{id}", response_model=Project, status_code=200)
async def get_projects(id: str  = Path(..., description="The ID of item")) -> Project:

    exisiting_project: Project
    try:
        exisiting_project = await repo.find_project_by_id(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not exisiting_project:
         raise NotFoundError(f"Project with ID {id} does not exist")
    
    return exisiting_project
@app.patch("/projects/{id}", response_model=Project, status_code=200)
async def patch_projects(id: str, body: UpdateProject, request: Request):
    # sub = _sub(request)
    # if(sub == None):
    #     raise ForbiddenError("Not a member of this workspace")

    # existing_ws_member: WorkspaceMember = await repo.find_membership(exisiting_project.workspace_id, sub)
    # if(existing_ws_member.role != "owner"):
    #         raise ForbiddenError("Requires the owner role")

    exisiting_project: Project
    try:
        exisiting_project = await repo.find_project_by_id(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not exisiting_project:
         raise NotFoundError(f"Project with ID {id} does not exist")


    # A PATCH that moves the project into another workspace must name an existing workspace
    incoming_ws = body.model_dump(exclude_unset=True).get("workspace_id")
    if incoming_ws is not None:
        try:
            destination_ws = await repo.find_workspace_by_id(incoming_ws)
        except Exception as db_error:
            raise DatabaseCrashError(db_error)
        if not destination_ws:
            raise NotFoundError(f"Workspace with ID {incoming_ws} does not exist")

    updated_project = await repo.update_project(id, body.model_dump(exclude_unset=True))
    return updated_project
@app.delete("/projects/{id}", status_code=204)
async def delete_projects(request: Request, id: str = Path(..., description="The ID of item")):
    # sub = _sub(request)
    # if(sub == None):
    #     raise ForbiddenError("Not a member of this workspace")

    # existing_ws_member: WorkspaceMember = await repo.find_membership(id, sub)
    # if(existing_ws_member.role != "owner"):
    #         raise ForbiddenError("Requires the owner role")


    exisiting_project: Project
    try:
        exisiting_project = await repo.find_project_by_id(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not exisiting_project:
         raise NotFoundError(f"Project with ID {id} does not exist")

    try:
        await repo.delete_project(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)
    return Response(status_code=204)




@app.get("/issues", status_code=200)
async def get_issues(request: Request) -> List[Issue]:
    sub = _sub(request)
    try:
        data = await repo.find_issues_for(sub)
        return data
    except Exception as db_error:
        raise DatabaseCrashError(db_error)
@app.post("/issues", status_code=201)
async def create_issues(body: CreateIssue) -> Issue:
    existing_project: Project
    try:
        existing_project = await repo.find_project_by_id(body.project_id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not existing_project:
         raise NotFoundError(f"Project with ID {body.project_id} does not exist")
    
    data = await repo.save_issue(body.project_id, body.title, body.status)
    return data
@app.get("/issues/{id}", status_code=200)
async def get_issues(
    id: str = Path(..., description="The ID of item"),
) -> Issue:

    existing_issue: Issue
    try:
        existing_issue = await repo.find_issue_by_id(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not existing_issue:
         raise NotFoundError(f"Issue with ID {id} does not exist")

    return existing_issue
@app.patch("/issues/{id}", response_model=Issue, status_code=200)
async def patch_issues(id: str, body: UpdateIssue, request: Request):
    # sub = _sub(request)
    # if(sub == None):
    #     raise ForbiddenError("Not a member of this workspace")

    # existing_ws_member: WorkspaceMember = await repo.find_membership(id, sub)
    # if(existing_ws_member.role != "owner"):
    #         raise ForbiddenError("Requires the owner role")

    existing_issue: Issue
    try:
        existing_issue = await repo.find_issue_by_id(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not existing_issue:
         raise NotFoundError(f"Issue with ID {id} does not exist")

    updated_issue = await repo.update_issue(id, body.model_dump(exclude_unset=True))
    return updated_issue
@app.delete("/issues/{id}", status_code=204)
async def delete_issues(
    request: Request,
    id: str = Path(..., description="The ID of item"),
):
    # sub = _sub(request)
    # if(sub == None):
    #     raise ForbiddenError("Not a member of this workspace")

    # existing_ws_member: WorkspaceMember = await repo.find_membership(id, sub)
    # if(existing_ws_member.role != "owner"):
    #         raise ForbiddenError("Requires the owner role")


    existing_issue: Issue
    try:
        existing_issue = await repo.find_issue_by_id(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not existing_issue:
         raise NotFoundError(f"Issue with ID {id} does not exist")

    try:
        await repo.delete_issue(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)
    return Response(status_code=204)

