from fastapi import FastAPI
from .repository import PostgresRepository
from .types import Workspace, Project, Issue
from typing import List 

app = FastAPI(title="Taskflow API - Day 3 with PostgreSQL")

repo = PostgresRepository()

@app.get("/workspaces")
async def get_workspaces() -> List[Workspace]:
    return await repo.findAllWorkspaces()

@app.get("/projects")
async def get_projects() -> List[Project]:
    return await repo.findAllProjects()

@app.get("/issues")
async def get_issues() -> List[Issue]:
    return await repo.findAllIssues()

@app.on_event("startup")
async def startup() -> None:
    from .db import init_db
    await init_db()
    print("Taskflow API running on port 8001")