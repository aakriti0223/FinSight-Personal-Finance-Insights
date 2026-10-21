
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.transaction import Transaction

router = APIRouter()


@router.get("/")
async def get_financial_summary(
    db: AsyncSession = Depends(get_db),
):
    statement = select(
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type == "income",
                        Transaction.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("total_income"),
        func.coalesce(
            func.sum(
                case(
                    (
                        Transaction.transaction_type == "expense",
                        Transaction.amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("total_expenses"),
        func.count(Transaction.id).label("transaction_count"),
    )

    result = await db.execute(statement)
    row = result.one()

    total_income = Decimal(str(row.total_income))
    total_expenses = Decimal(str(row.total_expenses))

    return {
        "total_income": str(total_income),
        "total_expenses": str(total_expenses),
        "balance": str(total_income - total_expenses),
        "transaction_count": row.transaction_count,
    }


@router.get("/spending-by-category")
async def get_spending_by_category(
    db: AsyncSession = Depends(get_db),
):
    normalized_category = func.initcap(
        func.lower(func.trim(Transaction.category))
    )

    statement = (
        select(
            normalized_category.label("category"),
            func.sum(Transaction.amount).label("total"),
        )
        .where(Transaction.transaction_type == "expense")
        .group_by(normalized_category)
        .order_by(func.sum(Transaction.amount).desc())
    )

    result = await db.execute(statement)
    rows = result.all()

    return [
        {
            "category": row.category,
            "total": str(Decimal(str(row.total))),
        }
        for row in rows
    ]
