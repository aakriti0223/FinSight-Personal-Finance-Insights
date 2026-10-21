
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Transaction(Base):
    __tablename__ = "transactions"

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="ck_transactions_amount_positive",
        ),
        CheckConstraint(
            "transaction_type IN ('income', 'expense')",
            name="ck_transactions_type_valid",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    transaction_type: Mapped[str] = mapped_column(
        String(10), nullable=False
    )
    category: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    description: Mapped[str] = mapped_column(
        String(255), nullable=False, default=""
    )
    transaction_date: Mapped[date] = mapped_column(
        Date, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
