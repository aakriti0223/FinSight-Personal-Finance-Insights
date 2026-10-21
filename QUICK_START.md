# Quick Start Guide

This is a production-ready FastAPI + React + PostgreSQL template deployed on Ubuntu.

## Access the Application

- **Frontend**: http://192.168.11.20:5174
- **Backend API**: http://192.168.11.20:8001
- **API Docs**: http://192.168.11.20:8001/api/v1/docs

## Quick Commands

```bash
cd /opt/apps/test-deployment

# Start all services
docker compose -f docker-compose.production.yml up -d

# View logs
docker compose -f docker-compose.production.yml logs -f

# Check status
docker compose -f docker-compose.production.yml ps

# Stop services
docker compose -f docker-compose.production.yml down
```

## Health Checks

```bash
# Backend (includes database status)
curl http://localhost:8001/api/v1/health | jq .

# Frontend
curl http://localhost:5174/health | jq .
```

## Documentation

- **Full README**: [README.md](README.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **GitHub**: https://github.com/guthdx/fastapi-react-postgres-template

## Stack

- FastAPI (async + SQLAlchemy)
- React 18 + Vite
- PostgreSQL 16
- Docker + Docker Compose
- Nginx (production)

## Port Note

⚠️ Port 8001 is shared with `wowasi_ya`. Stop wowasi_ya before running this deployment:
```bash
pm2 stop wowasi_ya
```
