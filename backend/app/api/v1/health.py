from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Health check endpoint that verifies:
    - API is running
    - Database connection is working
    """
    try:
        # Test database connection
        result = await db.execute(text("SELECT 1"))
        db_status = "healthy" if result else "unhealthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "backend",
        "database": db_status
    }
