
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TransactionCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    transaction_type: Literal["income", "expense"]
    category: str = Field(min_length=1, max_length=50)
    description: str = Field(default="", max_length=255)
    transaction_date: date


class TransactionUpdate(TransactionCreate):
    pass


class TransactionResponse(TransactionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
