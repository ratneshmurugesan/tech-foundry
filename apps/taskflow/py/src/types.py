from pydantic  import BaseModel, Field, field_validator
from uuid import uuid4
from datetime import datetime
from typing import Optional

__all__ = ["Workspace", "CreateWorkspace", "UpdateWorkspace", "Project", "CreateProject", "UpdateProject", "Issue", "CreateIssue", "UpdateIssue"]

class Workspace(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(min_length=3)
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True # This enables Workspace.model_validate(sqlalchemy_row) — the bridge between SQLAlchemy models and Pydantic API types.


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
    workspace_id: str = Field(..., description="workspaceId")

    class Config:
        from_attributes = True # This enables Project.model_validate(sqlalchemy_row) — the bridge between SQLAlchemy models and Pydantic API types.

class Issue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    project_id: str = Field(..., description="projectId")
    title: str  = Field(min_length=3)
    status: str = Field(default="open", description="status")
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True # This enables Issue.model_validate(sqlalchemy_row) — the bridge between SQLAlchemy models and Pydantic API types.

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in ["open", "closed"]:
            raise ValueError("status must be 'open' or 'closed'")
        return value

class CreateWorkspace(BaseModel):
    name: str = Field(min_length=3)
    class Config:
        from_attributes = True

class UpdateWorkspace(BaseModel):
    name: Optional[str] | None = None
    class Config:
        from_attributes = True

        

class CreateProject(BaseModel):
    workspace_id: str = Field(..., description="workspaceId")
    name: str = Field(min_length=3)
    class Config:
        from_attributes = True

class UpdateProject(BaseModel):
    workspace_id: Optional[str] | None = Field(default=None, description="workspaceId")
    name: Optional[str] | None = None
    class Config:
        from_attributes = True



class CreateIssue(BaseModel):
    project_id: str | None = Field(default=None, description="projectId")
    title: str = Field(min_length=3)
    status: str | None = Field(default="open", description="status")
    class Config:
        from_attributes = True

class UpdateIssue(BaseModel):
    project_id: Optional[str] | None = Field(default=None, description="projectId")
    title: Optional[str] | None = None
    status: Optional[str] | None = Field(default="open", description="status")
    class Config:
        from_attributes = True
    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in ["open", "closed"]:
            raise ValueError("status must be 'open' or 'closed'")
        return value