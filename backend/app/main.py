
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1 import health, transactions, summary

app = FastAPI(
    title="Personal Finance Insights",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register health API
app.include_router(
    health.router,
    prefix=settings.API_V1_STR,
    tags=["health"],
)

# Register transactions API
app.include_router(
    transactions.router,
    prefix=f"{settings.API_V1_STR}/transactions",
    tags=["transactions"],
)

# Register financial summary API
app.include_router(
    summary.router,
    prefix=f"{settings.API_V1_STR}/summary",
    tags=["summary"],
)


@app.get("/")
async def root():
    return {
        "message": "Personal Finance Insights API",
        "version": settings.VERSION,
        "docs": "/docs",
    }
