# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Production-ready full-stack template with FastAPI backend (async SQLAlchemy), React frontend (Vite), and PostgreSQL database, fully containerized with Docker Compose.

## Architecture

### Three-Tier Docker Architecture

**Database Layer** (`db` service):
- PostgreSQL 16 Alpine
- Health check: `pg_isready` every 10s
- Persistent volume: `postgres_data`
- Internal network only (no external ports)

**Backend Layer** (`backend` service):
- FastAPI with async support
- SQLAlchemy 2.0 async engine (`asyncpg` driver)
- Depends on `db` service health
- Exposes port `${BACKEND_PORT}:8000`

**Frontend Layer** (`frontend` service):
- React 18 + Vite (development)
- Nginx Alpine (production)
- Multi-stage Docker build
- Exposes port `${FRONTEND_PORT}:80`

### Configuration Pattern

All configuration is environment-based via Pydantic Settings:

**Key Pattern**: `backend/app/core/config.py` uses Pydantic `BaseSettings` which:
1. Reads from `.env` file
2. Supports environment variable overrides
3. Provides type validation and defaults

**CORS Handling**: The `BACKEND_CORS_ORIGINS` field has a custom validator that accepts both:
- Comma-separated string: `"http://localhost:5173,http://localhost:5174"`
- List of strings: `["http://localhost:5173", "http://localhost:5174"]`

This allows Docker Compose to pass single-string env vars that get parsed into lists.

### Database Session Management

**Async Pattern**: Uses `async_sessionmaker` from SQLAlchemy 2.0:
- Engine created with `postgresql+asyncpg://` DSN
- Session factory: `AsyncSessionLocal`
- Dependency injection: `get_db()` yields async session
- Auto-cleanup via context manager

**Usage in endpoints**:
```python
async def endpoint(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
```

### API Structure

**Router Pattern**:
- Main app: `backend/app/main.py`
- Versioned API: Routers under `backend/app/api/v1/`
- Health endpoint: `GET /api/v1/health` (includes database check)
- Auto-generated docs: `GET /api/v1/docs` (Swagger UI)

## Development Commands

### Local Development (without Docker)

**Backend**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

### Production Deployment (Docker)

**Build and start all services**:
```bash
docker compose -f docker-compose.production.yml up -d --build
```

**View logs**:
```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f backend
```

**Check service health**:
```bash
docker compose -f docker-compose.production.yml ps
```

**Stop services**:
```bash
# Stop (data persists)
docker compose -f docker-compose.production.yml stop

# Stop and remove containers (data persists in volume)
docker compose -f docker-compose.production.yml down

# Nuclear option: remove containers AND data
docker compose -f docker-compose.production.yml down -v
```

### Testing Endpoints

**Backend health (includes database status)**:
```bash
curl http://localhost:${BACKEND_PORT}/api/v1/health | jq .
# Expected: {"status":"healthy","database":"healthy",...}
```

**Frontend health**:
```bash
curl http://localhost:${FRONTEND_PORT}/health | jq .
# Expected: {"status":"healthy","service":"frontend"}
```

**API documentation**:
```bash
# Open in browser
open http://localhost:${BACKEND_PORT}/api/v1/docs
```

## Adding New Features

### Adding a New API Endpoint

1. Create router in `backend/app/api/v1/your_feature.py`:
```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

router = APIRouter()

@router.get("/items")
async def get_items(db: AsyncSession = Depends(get_db)):
    # Your async database logic here
    return {"items": []}
```

2. Register router in `backend/app/main.py`:
```python
from app.api.v1 import your_feature
app.include_router(your_feature.router, prefix=settings.API_V1_STR, tags=["items"])
```

### Adding Database Models

1. Create model in `backend/app/models/`:
```python
from app.db.session import Base
from sqlalchemy import Column, Integer, String

class YourModel(Base):
    __tablename__ = "your_table"
    id = Column(Integer, primary_key=True)
    name = Column(String)
```

2. Import model in `backend/app/db/session.py` for Alembic discovery

3. Generate migration:
```bash
docker compose exec backend alembic revision --autogenerate -m "Add your_table"
docker compose exec backend alembic upgrade head
```

### Frontend Integration

**API calls from React**: Uses Axios with base URL from environment:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const response = await axios.get(`${API_BASE_URL}/api/v1/your-endpoint`)
```

**Environment variables**: Vite requires `VITE_` prefix for client-side vars. Set in `.env`:
```
VITE_API_BASE_URL=http://localhost:8000
```

## Environment Configuration

Required `.env` file (copy from `.env.production.example`):

```bash
# Project
COMPOSE_PROJECT_NAME=my-app

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=ChangeMe123!  # MUST set in production
POSTGRES_DB=app_db

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=5173

# API
VITE_API_BASE_URL=http://localhost:8000
BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

**Security**: Never commit `.env` files. Always change `POSTGRES_PASSWORD` before deployment.

## Health Checks

All services have Docker health checks configured:

- **Database**: `pg_isready` command every 10s
- **Backend**: HTTP GET to `/api/v1/health` every 30s (40s startup grace period)
- **Frontend**: HTTP GET to `/health` every 30s (10s startup grace period)

Backend won't start until database is healthy (defined in `depends_on` with `condition: service_healthy`).

## Troubleshooting

**Backend won't start**: Check database health first:
```bash
docker compose -f docker-compose.production.yml ps db
docker compose -f docker-compose.production.yml logs db
```

**CORS errors**: Verify `BACKEND_CORS_ORIGINS` includes your frontend URL:
```bash
docker compose -f docker-compose.production.yml exec backend env | grep CORS
```

**Database connection errors**: Ensure `POSTGRES_SERVER=db` (service name in Docker network):
```bash
docker compose -f docker-compose.production.yml exec backend python -c "from app.core.config import settings; print(settings.DATABASE_URL)"
```

**Frontend can't reach backend**: Check `VITE_API_BASE_URL` matches backend's exposed port and host.
