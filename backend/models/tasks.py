from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints, model_validator

TaskPriority = Literal["high", "medium", "low"]
TaskSource = Literal["ai", "user"]

TaskTitle = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=200),
]


TaskDetails = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class TaskRead(BaseModel):
    id: int
    title: str
    details: str | None
    due_on: date | None
    source: TaskSource
    priority: TaskPriority
    completion_reason: str | None
    completed: bool
    # Only tasks the user wrote can be deleted. The ones the AI made can be
    # edited or marked as done, so the AI does not bring them back.
    can_delete: bool
    created_at: datetime


class RecommendationRead(BaseModel):
    id: int
    title: str
    details: str | None
    due_on: date
    signature: str


class TaskListResponse(BaseModel):
    today: date
    has_sensors: bool
    refresh: bool
    tasks: list[TaskRead]
    recommendations: list[RecommendationRead]


class TaskCreate(BaseModel):
    field_id: int
    title: TaskTitle
    details: TaskDetails | None = None
    due_on: date
    priority: TaskPriority = "medium"


class TaskUpdate(BaseModel):
    """What to change in a task. Only the sent fields change.

    `details` may be empty or null to clear it. The other fields cannot be null.
    """

    completed: bool | None = None
    title: TaskTitle | None = None
    details: TaskDetails | None = None
    priority: TaskPriority | None = None
    due_on: date | None = None

    @model_validator(mode="after")
    def _check_what_was_sent(self):
        if not self.model_fields_set:
            raise ValueError("Nothing to update")
        for name in ("completed", "title", "priority", "due_on"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class GenerateResponse(BaseModel):
    gardens: int = Field(description="Gardens that have something to review")
    reviewed: int = Field(description="Gardens the AI reviewed in this run")
