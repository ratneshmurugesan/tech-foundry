from typing import List, Optional
from .db import get_session
from .models import WorkspaceModel, ProjectModel, IssueModel, WorkspaceMemberModel
from .types import Workspace, Project, Issue, WorkspaceMember, CreateWorkspaceMember
from .ids import generate_id
from sqlalchemy import select, update, and_

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
    async def save_workspace_with_owner(self, name: str, sub: str) -> Workspace:
        """Create the workspace AND mint the creator as owner in ONE transaction — closes the orphan-creator window of save_workspace + mint_owner as two commits."""
        ws_id = generate_id()  # resolved upfront so the FK below holds the real value
        session = await get_session()
        try:
            model = WorkspaceModel(id=ws_id, name=name)
            session.add(model)
            await session.flush()  # force the parent row into the transaction BEFORE the dependent member row
            session.add(
                WorkspaceMemberModel(
                    id=generate_id(),
                    workspace_id=ws_id,
                    user_id=sub,
                    role="owner"
                )
            )
            await session.commit()
            await session.refresh(model)
            return Workspace.model_validate(model)
        finally:
            await session.close()
    async def update_workspace(self, id: str, changes: dict) -> Workspace:
        """The route hands in body.model_dump(exclude_unset=True) — a plain dict, never the pydantic model."""
        session = await get_session()
        try:
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

    async def find_workspace_id_for(self, workspace_id: str, sub: str | None) -> Optional[Workspace]:
        # Doorless (sub None): a membership join can never match — fall back to the plain lookup.
        if sub is None:
            return await self.find_workspace_by_id(workspace_id)

        session = await get_session()
        try:
            query = (
                select(WorkspaceModel)
                .join(WorkspaceMemberModel, WorkspaceMemberModel.workspace_id == WorkspaceModel.id)
                .where(
                    and_(
                        WorkspaceMemberModel.user_id == sub,
                        WorkspaceModel.id == workspace_id
                    )
                )
                .limit(1)
            )
             
            result = await session.execute(query)
            workspace_model = result.scalars().first()

            if not workspace_model:
                return None
            return Workspace.model_validate(workspace_model)
        finally:
            await session.close()

    async def find_workspaces_for(self, sub: str | None) -> List[Workspace]:
        # Doorless (sub None): the membership join can never match — serve all workspaces, like the pre-Day-10 read.
        if sub is None:
            return await self.find_all_workspaces()
        session = await get_session()
        try:
            result = await session.execute(
                    select(WorkspaceModel)
                    .join(
                        WorkspaceMemberModel, 
                        WorkspaceMemberModel.workspace_id == WorkspaceModel.id)
                    .where(
                        WorkspaceMemberModel.user_id == sub,
                    )
                )
            rows = result.scalars().all()
            return [Workspace.model_validate(r) for r in rows]
        finally:
            await session.close()

    # Name-lies fixed: the parameter is the badge sub, and the return is a WorkspaceMember (not the Membership DTO).
    async def find_membership(self, workspace_id: str, sub: str) -> Optional[WorkspaceMember]:
        session = await get_session()
        try:
            result = await session.execute(
                select(WorkspaceMemberModel)
                .where(and_(
                    WorkspaceMemberModel.user_id == sub,
                    WorkspaceMemberModel.workspace_id == workspace_id,
                )))
            row = result.scalars().first()
            return WorkspaceMember.model_validate(row) if row else None
        finally:
            await session.close()

    async def invite_member(self, changes: CreateWorkspaceMember) -> WorkspaceMember:
        session = await get_session()
        try:
            model = WorkspaceMemberModel(
                id=generate_id(), 
                workspace_id=changes.workspace_id, 
                user_id=changes.user_id,
                role=changes.role or "member"
            )
            session.add(model)
            await session.commit()
            await session.refresh(model)
            return WorkspaceMember.model_validate(model)
        finally:
            await session.close()

    async def find_members_for(self, workspace_id: str) -> List[WorkspaceMember]:
        session = await get_session()

        try:
            result = await session.execute(
                select(WorkspaceMemberModel)
                .where(
                    WorkspaceMemberModel.workspace_id == workspace_id
                )
            )
            rows = result.scalars().all()
            return [WorkspaceMember.model_validate(r) for r in rows]
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

    async def update_project(self, id: str, changes: dict) -> Project:
        """The route hands in body.model_dump(exclude_unset=True) — a plain dict, never the pydantic model."""
        session = await get_session()
        try:
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

    async def find_projects_for(self, sub: str | None) -> List[Project]:
        # Doorless (sub None): the membership join can never match — serve all projects, like the pre-Day-10 read.
        if sub is None:
            return await self.find_all_projects()
        session = await get_session()
        try:
            result = await session.execute(
                    select(ProjectModel)
                    .join(
                        WorkspaceMemberModel, 
                        WorkspaceMemberModel.workspace_id == ProjectModel.workspace_id)
                    .where(
                        WorkspaceMemberModel.user_id == sub,
                    )
                )
            rows = result.scalars().all()
            return [Project.model_validate(r) for r in rows]
        finally:
            await session.close()

    """--- Issues ---"""

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

    async def update_issue(self, id: str, changes: dict) -> Issue:
        session = await get_session()
        try:

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

    async def find_issues_for(self, sub: str | None) -> List[Issue]:
        # Doorless (sub None): the membership join can never match — serve all issues, like the pre-Day-10 read.
        if sub is None:
            return await self.find_all_issues()
        session = await get_session()
        try:
            statement = (
                select(IssueModel)
                    .join(
                        ProjectModel, 
                        ProjectModel.id == IssueModel.project_id
                    )
                    .join(
                        WorkspaceMemberModel, 
                        WorkspaceMemberModel.workspace_id == ProjectModel.workspace_id
                    )
                    .where(
                        WorkspaceMemberModel.user_id == sub,
                    )
                )
            result = await session.execute(statement)
            rows = result.scalars().all()
            return [Issue.model_validate(r) for r in rows]
        finally:
            await session.close()

    async def mint_owner(self, workspace_id: str, sub: str) -> None:
        session = await get_session()
        try:
            session.add(
                WorkspaceMemberModel(
                    id=generate_id(), 
                    workspace_id=workspace_id, 
                    user_id=sub, 
                    role="owner"
                )
            )
            await session.commit()
        finally:
            await session.close()