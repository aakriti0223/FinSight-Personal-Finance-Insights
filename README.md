# FastAPI React Postgres Template

A production-ready full-stack application template featuring FastAPI backend, React frontend with Vite, and PostgreSQL database - all containerized with Docker.

## Features

- **Backend**: FastAPI with async support, SQLAlchemy ORM, and Alembic migrations
- **Frontend**: React with Vite for fast development and optimized builds
- **Database**: PostgreSQL with health checks
- **Production Ready**: Docker Compose with health checks, auto-restart, and proper networking
- **CORS Configured**: Secure cross-origin resource sharing
- **Health Endpoints**: Both backend and frontend health check endpoints
- **Environment-Based Config**: Easy configuration via `.env` files

## Tech Stack

### Backend
- FastAPI 0.115+
- SQLAlchemy 2.0 (async)
- PostgreSQL 16
- Uvicorn
- Pydantic v2

### Frontend
- React 18
- Vite 5
- Axios
- Nginx (production)

### Infrastructure
- Docker & Docker Compose
- PostgreSQL 16 Alpine
- Node 20 Alpine

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/guthdx/fastapi-react-postgres-template.git
cd fastapi-react-postgres-template
```

2. Copy environment file:
```bash
cp .env.production.example .env
```

3. Edit `.env` and configure your settings:
```env
COMPOSE_PROJECT_NAME=my-app
POSTGRES_PASSWORD=YourSecurePassword123!
BACKEND_PORT=8000
FRONTEND_PORT=5173
VITE_API_BASE_URL=http://localhost:8000
BACKEND_CORS_ORIGINS=http://localhost:5173
```

4. Build and run:
```bash
docker compose -f docker-compose.production.yml up -d --build
```

5. Verify deployment:
```bash
# Backend health check
curl http://localhost:8000/api/v1/health

# Frontend health check
curl http://localhost:5173/health
```

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── health.py       # Health check endpoint
│   │   ├── core/
│   │   │   └── config.py           # Application config
│   │   ├── db/
│   │   │   └── session.py          # Database session
│   │   └── main.py                 # FastAPI app
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main React component
│   │   ├── main.jsx                # React entry point
│   │   ├── App.css
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf                  # Production nginx config
│   ├── package.json
│   └── vite.config.js
├── docker-compose.production.yml
├── .env.production.example
└── README.md
```

## API Endpoints

### Backend (http://localhost:8000)

- `GET /` - Root endpoint
- `GET /api/v1/health` - Health check with database status
- `GET /api/v1/docs` - Swagger UI documentation

### Frontend (http://localhost:5173)

- `GET /` - React application
- `GET /health` - Frontend health check

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COMPOSE_PROJECT_NAME` | Docker Compose project name | `fastapi-react-postgres` |
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | *Required* |
| `POSTGRES_DB` | PostgreSQL database name | `app_db` |
| `BACKEND_PORT` | Backend port mapping | `8000` |
| `FRONTEND_PORT` | Frontend port mapping | `5173` |
| `VITE_API_BASE_URL` | Frontend API base URL | `http://localhost:8000` |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |

### Health Checks

All services include Docker health checks:
- **PostgreSQL**: `pg_isready` check every 10s
- **Backend**: HTTP GET to `/api/v1/health` every 30s
- **Frontend**: HTTP GET to `/health` every 30s

## Deployment

### Production Deployment

1. Configure environment variables for production
2. Update `VITE_API_BASE_URL` to your production API URL
3. Update `BACKEND_CORS_ORIGINS` to your production frontend URL
4. Deploy with:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f backend
docker compose -f docker-compose.production.yml logs -f frontend
docker compose -f docker-compose.production.yml logs -f db
```

### Stopping Services

```bash
# Stop containers
docker compose -f docker-compose.production.yml stop

# Stop and remove containers
docker compose -f docker-compose.production.yml down

# Stop and remove containers + volumes (WARNING: deletes database data)
docker compose -f docker-compose.production.yml down -v
```

## Database Migrations

The template uses Alembic for database migrations:

```bash
# Create a new migration
docker compose exec backend alembic revision --autogenerate -m "Description"

# Apply migrations
docker compose exec backend alembic upgrade head

# Revert migration
docker compose exec backend alembic downgrade -1
```

## Security Notes

- Always change `POSTGRES_PASSWORD` before deployment
- Never commit `.env` files to version control
- Use HTTPS in production
- Configure proper CORS origins for production
- Use secrets management for production credentials

## Troubleshooting

### Backend won't start
- Check database is healthy: `docker compose ps`
- Check logs: `docker compose logs backend`
- Verify environment variables in `.env`

### Frontend can't connect to backend
- Verify `VITE_API_BASE_URL` is correct
- Check `BACKEND_CORS_ORIGINS` includes your frontend URL
- Check backend is healthy: `curl http://localhost:8000/api/v1/health`

### Database connection errors
- Ensure PostgreSQL container is running
- Verify `POSTGRES_PASSWORD` is set
- Check database logs: `docker compose logs db`

## License

MIT License - feel free to use this template for any project.

## Contributing

Contributions welcome! Please open an issue or pull request.
