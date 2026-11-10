from typing import Literal

from pydantic import BaseModel

CareLevel = Literal["lack", "ok", "excess", "unknown"]
HarvestStatus = Literal["ready", "not_ready", "no_fruit", "unknown"]


class PlantCare(BaseModel):
    water: CareLevel = "unknown"
    light: CareLevel = "unknown"
    harvest: HarvestStatus = "unknown"


class PlantDiagnosis(BaseModel):
    healthy: bool | None = None
    name: str
    confidence: float | None = None
    advice: str | None = None
    water: CareLevel = "unknown"
    light: CareLevel = "unknown"
    harvest: HarvestStatus = "unknown"
    provider: str
