
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter()


def normalize_transaction_data(payload):
    """Normalize transaction fields before saving."""
    data = payload.model_dump()
    data["category"] = data["category"].strip().title()
    data["description"] = data["description"].strip()
    return data


@router.post(
    "/",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_transaction(
    payload: TransactionCreate,
    db: AsyncSession = Depends(get_db),
):
    data = normalize_transaction_data(payload)

    if not data["category"]:
        raise HTTPException(
            status_code=422,
            detail="Category cannot be empty.",
        )

    transaction = Transaction(**data)

    try:
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        return transaction
    except Exception:
        await db.rollback()
        raise


@router.get("/", response_model=list[TransactionResponse])
async def list_transactions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    statement = (
        select(Transaction)
        .order_by(
            Transaction.transaction_date.desc(),
            Transaction.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(statement)
    return result.scalars().all()


@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse,
)
async def get_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
):
    transaction = await db.get(Transaction, transaction_id)

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found.",
        )

    return transaction


@router.put(
    "/{transaction_id}",
    response_model=TransactionResponse,
)
async def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
):
    transaction = await db.get(Transaction, transaction_id)

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found.",
        )

    data = normalize_transaction_data(payload)

    if not data["category"]:
        raise HTTPException(
            status_code=422,
            detail="Category cannot be empty.",
        )

    try:
        for field, value in data.items():
            setattr(transaction, field, value)

        await db.commit()
        await db.refresh(transaction)
        return transaction
    except Exception:
        await db.rollback()
        raise


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
):
    transaction = await db.get(Transaction, transaction_id)

    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found.",
        )

    try:
        await db.delete(transaction)
        await db.commit()
    except Exception:
        await db.rollback()
        raise
