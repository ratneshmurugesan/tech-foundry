from sqlalchemy import Column, String, DateTime, ForeignKey, text
from .db import Base

"""
SQLAlchemy table definitions 
"""

class WorkspaceModel(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=text("now()"))

class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"))
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=text("now()"))

class IssueModel(Base):
    __tablename__ = "issues"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"))
    title = Column(String, nullable=False)
    status = Column(String, server_default="open")
    created_at = Column(DateTime, server_default=text("now()"))

