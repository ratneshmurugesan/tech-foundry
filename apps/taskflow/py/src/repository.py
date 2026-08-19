from typing import List, Optional
from .db import get_session
from .models import WorkspaceModel, ProjectModel, IssueModel
from .types import Workspace, Project, Issue
from .ids import generate_id
from sqlalchemy import select
from contextlib import asynccontextmanager

"""
PostgresRepository — replaces InMemoryRepository.
"""

class PostgresRepository:
    """--- Workspaces ---"""

    async def findAllWorkspaces(self) -> List[Workspace]:
        session = await get_session()
        try:
            result = await session.execute(select(WorkspaceModel))
            rows = result.scalars().all()
            return [Workspace.model_validate(r) for r in rows]
        finally:
            await session.close()

    async def findWorkspaceById(self, id: str) -> Optional[Workspace]:
        session = await get_session()
        try:
            result = await session.execute(select(WorkspaceModel).where(WorkspaceModel.id == id))
            row = result.scalar_one_or_none()
            return Workspace.model_validate(row) if row else None
        finally:
            await session.close()

    async def saveWorkspace(self, name: str) -> Workspace:
        session = await get_session()
        try:
            model = WorkspaceModel(id=generate_id(), name=name)
            session.add(model)
            await session.commit()
            await session.refresh(model)
            return Workspace.model_validate(model)
        finally:
            await session.close()

    async def deleteWorkspace(self, id: str) -> bool:
        session = await get_session()
        try:
            row = await session.get(WorkspaceModel, id)
            if row:
                await session.delete(row)
                await session.commit()
                return True
            return False
        finally:
            await session.close()

    """--- Projects ---"""

    async def findAllProjects(self) -> List[Project]:
        session = await get_session()
        try:
            result = await session.execute(select(ProjectModel))
            rows = result.scalars().all()
            return [Project.model_validate(r) for r in rows]
        finally:
            await session.close()

    async def findProjectById(self, id: str) -> Optional[Project]:
        session = await get_session()
        try:
            row = await session.get(ProjectModel, id)
            return Project.model_validate(row) if row else None
        finally:
            await session.close()

    async def saveProject(self, workspace_id: str, name: str) -> Project:
        session = await get_session()
        try:
            model = ProjectModel(id=generate_id(), workspace_id=workspace_id, name=name)
            session.add(model)
            await session.commit()
            await session.refresh(model)
            return Project.model_validate(model)
        finally:
            await session.close()

    async def deleteProject(self, id:str) -> bool:
        session = await get_session()
        try:
            row = await session.get(ProjectModel, id)
            if row:
                await session.delete(row)
                await session.commit()
                return True
            return False
        finally:
            await session.close()

    async def findAllIssues(self) -> List[Issue]:
        session = await get_session()
        try:
            result = await session.execute(select(IssueModel))
            rows = result.scalars().all()
            return [Issue.model_validate(r) for r in rows]
        finally:
            await session.close()

    async def findIssueById(self, id: str) -> Optional[Issue]:
        session = await get_session()
        try:
            row = await session.get(IssueModel, id)
            return Issue.model_validate(row) if row else None
        finally:
            await session.close()
    
    async def saveIssue(self, project_id: str, title: str, status: str = "open") -> Issue:
        session = await get_session()
        try:
            model = IssueModel(id=generate_id(), project_id=project_id, title=title, status=status)
            session.add(model)
            await session.commit()
            await session.refresh(model)
            return Issue.model_validate(model)
        finally:
            await session.close()

    async def deleteIssue(self, id: str) -> bool:
        session = await get_session()
        try:
            row = await session.get(IssueModel, id)
            if row:
                await session.delete(row)
                await session.commit()
                return True
            return False
        finally:
            await session.close()