from pydantic  import BaseModel, Field, field_validator
from uuid import uuid4, UUID
from datetime import datetime

__all__ = ["Workspace", "Project", "Issue"]

class Workspace(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        use_enum_values = False

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
    workspace_id: str = Field(..., description="workspaceId")

class Issue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    project_id: str = Field(..., description="projectId")
    title: str
    status: str = Field(default="open", description="status")
    created_at: datetime = Field(default_factory=datetime.now)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in ["open", "closed"]:
            raise ValueError("status must be 'open' or 'closed'")
        return value
