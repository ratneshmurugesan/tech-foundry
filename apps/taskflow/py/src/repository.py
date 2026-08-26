from typing import List, Optional
from .db import get_session
from .models import WorkspaceModel, ProjectModel, IssueModel
from .types import Workspace, UpdateWorkspace, Project, UpdateProject, Issue, UpdateIssue
from .ids import generate_id
from sqlalchemy import select, update

"""
PostgresRepository — replaces InMemoryRepository.
"""

class PostgresRepository:
    """--- Workspaces ---"""

    async def find_all_workspaces(self) -> List[Workspace]:
        session = await get_session()
        try:
            result = await session.execute(select(WorkspaceModel))
            rows = result.scalars().all()
            return [Workspace.model_validate(r) for r in rows]
        finally:
            await session.close()

    async def find_workspace_by_id(self, id: str) -> Optional[Workspace]:
        session = await get_session()
        try:
            result = await session.execute(select(WorkspaceModel).where(WorkspaceModel.id == id))
            row = result.scalar_one_or_none()
            return Workspace.model_validate(row) if row else None
        finally:
            await session.close()

    async def save_workspace(self, name: str) -> Workspace:
        session = await get_session()
        try:
            model = WorkspaceModel(id=generate_id(), name=name)
            session.add(model)
            await session.commit()
            await session.refresh(model)
            return Workspace.model_validate(model)
        finally:
            await session.close()

    async def update_workspace(self, id: str, changes: UpdateWorkspace) -> Workspace:
        partial = changes
        session = await get_session()
        try:
            # model = WorkspaceModel()
            partial = {
                k: v for k,v in changes.items() if v is not None
            }
            await session.execute(update(WorkspaceModel).where(WorkspaceModel.id == id).values(**partial))
            await session.commit()
            row = await session.get(WorkspaceModel, id)
            return Workspace.model_validate(row) if row else None 
        finally:
            await session.close()

    async def delete_workspace(self, id: str) -> bool:
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

    async def find_all_projects(self) -> List[Project]:
        session = await get_session()
        try:
            result = await session.execute(select(ProjectModel))
            rows = result.scalars().all()
            return [Project.model_validate(r) for r in rows]
        finally:
            await session.close()

    async def find_project_by_id(self, id: str) -> Optional[Project]:
        session = await get_session()
        try:
            row = await session.get(ProjectModel, id)
            return Project.model_validate(row) if row else None
        finally:
            await session.close()

    async def save_project(self, workspace_id: str, name: str) -> Project:
        session = await get_session()
        try:
            model = ProjectModel(id=generate_id(), workspace_id=workspace_id, name=name)
            session.add(model)
            await session.commit()
            await session.refresh(model)
            return Project.model_validate(model)
        finally:
            await session.close()

    async def update_project(self, id: str, changes: UpdateProject) -> Project:
        session = await get_session()
        try:
            # model = ProjectModel()
            partial = {
                k: v for k,v in changes.items() if v is not None
            }
            await session.execute(update(ProjectModel).where(ProjectModel.id == id).values(**partial))
            await session.commit()
            row = await session.get(ProjectModel, id)
            return Project.model_validate(row) if row else None 
        finally:
            await session.close()

    async def delete_project(self, id:str) -> bool:
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

    async def find_all_issues(self) -> List[Issue]:
        session = await get_session()
        try:
            result = await session.execute(select(IssueModel))
            rows = result.scalars().all()
            return [Issue.model_validate(r) for r in rows]
        finally:
            await session.close()

    async def find_issue_by_id(self, id: str) -> Optional[Issue]:
        session = await get_session()
        try:
            row = await session.get(IssueModel, id)
            return Issue.model_validate(row) if row else None
        finally:
            await session.close()
    
    async def save_issue(self, project_id: str, title: str, status: str = "open") -> Issue:
        session = await get_session()
        try:
            model = IssueModel(id=generate_id(), project_id=project_id, title=title, status=status)
            session.add(model)
            await session.commit()
            await session.refresh(model)
            return Issue.model_validate(model)
        finally:
            await session.close()

    async def update_issue(self, id: str, changes: UpdateIssue) -> Issue:
        session = await get_session()
        try:
            # model = IssueModel()
            partial = {
                k: v for k,v in changes.items() if v is not None
            }
            await session.execute(update(IssueModel).where(IssueModel.id == id).values(**partial))
            await session.commit()
            row = await session.get(IssueModel, id)
            return Issue.model_validate(row) if row else None 
        finally:
            await session.close()

    async def delete_issue(self, id: str) -> bool:
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