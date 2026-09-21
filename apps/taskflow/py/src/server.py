from fastapi import FastAPI, Path, Query
from typing import List
from contextlib import asynccontextmanager

from .repository import PostgresRepository
from .types import Workspace, CreateWorkspace, UpdateWorkspace, Project,  CreateProject, UpdateProject, Issue, CreateIssue, UpdateIssue
from .error_handlers import register_error_handlers
from .errors import DatabaseCrashError, NotFoundError
from .auth import AuthenticateBadgeMiddleware

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
async def get_workspaces() -> List[Workspace]:
    try:
        data = await repo.find_all_workspaces()
        return data
    except Exception as db_error:
        raise DatabaseCrashError(db_error)
@app.post("/workspaces", response_model=Workspace, status_code=201)
async def create_workspaces(body: CreateWorkspace):
    try:
        new_ws = await repo.save_workspace(body.name)
        return new_ws
    except Exception as db_error:
        raise DatabaseCrashError(db_error)
@app.get("/workspaces/{id}", response_model=Workspace, status_code=200)
async def get_workspaces(id: str) -> Workspace:
    existing_ws: Workspace
    try:
        existing_ws = await repo.find_workspace_by_id(id)
    except Exception as db_err:
        raise DatabaseCrashError(db_err)

    if not existing_ws:
        raise NotFoundError(f"Workspace with ID {id} does not exist")

    return existing_ws
@app.patch("/workspaces/{id}", response_model=Workspace, status_code=200)
async def patch_workspaces(id: str, body: UpdateWorkspace)-> Workspace:
        existing_ws: Workspace
        try:
            existing_ws = await repo.find_workspace_by_id(id)
        except Exception as db_err:
            raise DatabaseCrashError(db_err)

        if not existing_ws:
            raise NotFoundError(f"Workspace with ID {id} does not exist")

        # Extract ONLY fields explicitly sent in the HTTP request payload
        update_ws = await repo.update_workspace(id, body.model_dump(exclude_unset=True))
        return update_ws
@app.delete("/workspaces/{id}", status_code=204)
async def delete_workspaces(id: str = Path(..., description="The ID of item")):
    existing_ws: Workspace
    try:
        existing_ws = await repo.find_workspace_by_id(id)
    except Exception as db_err:
        raise DatabaseCrashError(db_err)

    if not existing_ws:
        raise NotFoundError(f"Workspace with ID {id} does not exist")

    is_deleted = False
    try:
        is_deleted = await repo.delete_workspace(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if is_deleted is None:
         raise NotFoundError(f"Workspace with ID {id} does not exist")

    return is_deleted
    


@app.get("/projects")
async def get_projects() -> List[Project]:
    try:
        data = await repo.find_all_projects()
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
async def patch_projects(id: str, body: UpdateProject):
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
async def delete_projects(id: str = Path(..., description="The ID of item")):
    exisiting_project: Project
    try:
        exisiting_project = await repo.find_project_by_id(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not exisiting_project:
         raise NotFoundError(f"Project with ID {id} does not exist")

    is_deleted = False
    try:
        is_deleted = await repo.delete_project(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if is_deleted is None:
         raise NotFoundError(f"Project with ID {id} does not exist")

    return is_deleted



@app.get("/issues", status_code=200)
async def get_issues() -> List[Issue]:
    try:
        data = await repo.find_all_issues()
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
async def patch_issues(id: str, body: UpdateIssue):
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
    id: str = Path(..., description="The ID of item"),
):
    existing_issue: Issue
    try:
        existing_issue = await repo.find_issue_by_id(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if not existing_issue:
         raise NotFoundError(f"Issue with ID {id} does not exist")

    is_deleted = False
    try:
        is_deleted = await repo.delete_issue(id)
    except Exception as db_error:
        raise DatabaseCrashError(db_error)

    if is_deleted is None:
         raise NotFoundError(f"Issue with ID {id} does not exist")

    return is_deleted
