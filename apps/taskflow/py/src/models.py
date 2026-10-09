from sqlalchemy import Column, String, DateTime, ForeignKey, text, CheckConstraint, UniqueConstraint, Index
from .db import Base

"""
SQLAlchemy table definitions 
"""

class WorkspaceModel(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True)
    name = Column(String, nullable=False)
    plan_tier = Column(String, nullable=False, server_default=text("'free'"))
    created_at = Column(DateTime, server_default=text("now()"))

class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete='cascade'))
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=text("now()"))

class IssueModel(Base):
    __tablename__ = "issues"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete='cascade'))
    title = Column(String, nullable=False)
    status = Column(String, server_default="open")
    created_at = Column(DateTime, server_default=text("now()"))

class WorkspaceMemberModel(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (
        CheckConstraint("role IN ('owner','member')", name="ck_ws_member_role"),
        UniqueConstraint("workspace_id", "user_id", name="uq_ws_member"),
        Index("ix_ws_member_user", "user_id"),
    )

    id = Column(String(36), primary_key=True)
    workspace_id=Column(String(36), ForeignKey("workspaces.id", ondelete='cascade'), index=False)
    user_id=Column(String, nullable=False)
    role=Column(String, nullable=False, server_default=text("'member'"))
    created_at=Column(DateTime, server_default=text('now()'))

