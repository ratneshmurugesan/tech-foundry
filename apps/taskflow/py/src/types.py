from pydantic  import BaseModel, Field, field_validator
from uuid import uuid4, UUID
from datetime import datetime

__all__ = ["Workspace", "Project", "Issue"]

class Workspace(BaseModel):
    id: UUID = str(uuid4())
    name: str
    created_at: datetime = datetime.now

    class Config:
        use_enum_values = False

class Project(BaseModel):
    id: UUID = str(uuid4())
    name: str
    created_at: datetime = datetime.now
    workspace_id: UUID= Field(..., description="workspaceId")

class Issue(BaseModel):
    id: UUID = str(uuid4())
    project_id: UUID = Field(..., description="projectId")
    title: str
    status: str = Field(default="open", description="status")
    created_at: datetime = datetime.now

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in ["open", "closed"]:
            raise ValueError("status must be 'open' or 'closed'")
        return value
