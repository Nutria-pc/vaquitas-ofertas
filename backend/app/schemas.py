from pydantic import BaseModel, ConfigDict
from datetime import datetime

class PriceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    store: str
    price_crc: float
    original_price: float | None
    original_currency: str
    product_url: str
    format: str
    observed_at: datetime
    is_verified: bool

class GameOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    platform: str
    release_date: str | None
    msrp_crc: float | None
    cover_url: str | None
