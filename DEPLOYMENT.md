# Deployment Documentation

This document describes the production deployment of the FastAPI-React-Postgres template on the Iyeska Ubuntu server.

## Server Information

- **Host**: Ubuntu 24.04.3 LTS (192.168.11.20)
- **Deployment Path**: `/opt/apps/test-deployment/`
- **Deployed**: December 7, 2025
- **GitHub**: https://github.com/guthdx/fastapi-react-postgres-template

## Service Endpoints

### Frontend (React + Nginx)
- **URL**: http://192.168.11.20:5174
- **Health Check**: http://192.168.11.20:5174/health
- **Container**: `test-deployment-frontend`
- **Port Mapping**: 5174:80

### Backend (FastAPI)
- **URL**: http://192.168.11.20:8001
- **Health Check**: http://192.168.11.20:8001/api/v1/health
- **API Documentation**: http://192.168.11.20:8001/api/v1/docs
- **Container**: `test-deployment-backend`
- **Port Mapping**: 8001:8000

### Database (PostgreSQL 16)
- **Container**: `test-deployment-db`
- **Internal Port**: 5432 (not exposed externally)
- **Database Name**: `test_deployment_db`
- **User**: `postgres`

## Environment Configuration

Location: `/opt/apps/test-deployment/.env`

```bash
COMPOSE_PROJECT_NAME=test-deployment
POSTGRES_USER=postgres
POSTGRES_PASSWORD=TestPass123!Change
POSTGRES_DB=test_deployment_db
BACKEND_PORT=8001
FRONTEND_PORT=5174
VITE_API_BASE_URL=http://192.168.11.20:8001
BACKEND_CORS_ORIGINS=http://192.168.11.20:5174
```

⚠️ **Security Note**: The `.env` file is not tracked in git and contains sensitive credentials.

## Docker Compose Configuration

The deployment uses `docker-compose.production.yml` with:

- **3 Services**: Database, Backend, Frontend
- **Health Checks**: All services have health checks configured
- **Auto-Restart**: Services restart automatically on failure
- **Named Volume**: `test-deployment_postgres_data` for database persistence
- **Bridge Network**: `test-deployment_app-network` for inter-service communication

## Management Commands

### Start Services
```bash
cd /opt/apps/test-deployment
docker compose -f docker-compose.production.yml up -d
```

### View Logs
```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f backend
docker compose -f docker-compose.production.yml logs -f frontend
docker compose -f docker-compose.production.yml logs -f db
```

### Check Status
```bash
docker compose -f docker-compose.production.yml ps
```

### Restart Services
```bash
# All services
docker compose -f docker-compose.production.yml restart

# Specific service
docker compose -f docker-compose.production.yml restart backend
```

### Stop Services
```bash
# Stop containers (data persists)
docker compose -f docker-compose.production.yml stop

# Stop and remove containers (data persists in volume)
docker compose -f docker-compose.production.yml down

# Stop, remove containers AND delete data (⚠️ DESTRUCTIVE)
docker compose -f docker-compose.production.yml down -v
```

### Rebuild After Code Changes
```bash
docker compose -f docker-compose.production.yml up -d --build
```

## Health Check Examples

### Backend Health Check
```bash
curl http://localhost:8001/api/v1/health | jq .
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-07T18:48:38.579077",
  "service": "backend",
  "database": "healthy"
}
```

### Frontend Health Check
```bash
curl http://localhost:5174/health | jq .
```

Expected response:
```json
{
  "status": "healthy",
  "service": "frontend"
}
```

## Port Conflicts

⚠️ **Important**: Port 8001 is also used by `wowasi_ya` (managed by PM2).

To avoid conflicts:

```bash
# Stop wowasi_ya to run this deployment
pm2 stop wowasi_ya

# OR change BACKEND_PORT in .env and rebuild
nano /opt/apps/test-deployment/.env  # Change BACKEND_PORT=8002
docker compose -f docker-compose.production.yml up -d --build
```

## Troubleshooting

### Backend Won't Start

1. Check database health:
   ```bash
   docker compose -f docker-compose.production.yml ps db
   ```

2. View backend logs:
   ```bash
   docker compose -f docker-compose.production.yml logs backend
   ```

3. Verify environment variables:
   ```bash
   docker compose -f docker-compose.production.yml exec backend env | grep POSTGRES
   ```

### Frontend Can't Connect to Backend

1. Check CORS configuration in `.env`:
   ```bash
   grep BACKEND_CORS_ORIGINS .env
   ```

2. Verify backend is accessible:
   ```bash
   curl http://localhost:8001/api/v1/health
   ```

3. Check frontend environment:
   ```bash
   docker compose -f docker-compose.production.yml exec frontend cat /etc/nginx/conf.d/default.conf
   ```

### Database Connection Errors

1. Check database logs:
   ```bash
   docker compose -f docker-compose.production.yml logs db
   ```

2. Verify database is running:
   ```bash
   docker compose -f docker-compose.production.yml exec db pg_isready -U postgres
   ```

3. Check backend can connect:
   ```bash
   docker compose -f docker-compose.production.yml exec backend python -c "from app.db.session import engine; print('OK')"
   ```

## Backup and Recovery

### Backup Database
```bash
docker compose -f docker-compose.production.yml exec db pg_dump -U postgres test_deployment_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
cat backup_20251207_123456.sql | docker compose -f docker-compose.production.yml exec -T db psql -U postgres test_deployment_db
```

### Backup Volume
```bash
docker run --rm \
  -v test-deployment_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_volume_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

## Monitoring

### View Resource Usage
```bash
docker stats test-deployment-backend test-deployment-frontend test-deployment-db
```

### Check Container Health
```bash
docker inspect test-deployment-backend | jq '.[0].State.Health'
```

## Updating the Deployment

### Pull Latest Changes from GitHub
```bash
cd /opt/apps/test-deployment
git pull origin main
```

### Apply Updates
```bash
# Update environment if needed
nano .env

# Rebuild and restart
docker compose -f docker-compose.production.yml up -d --build
```

## Network Access

This deployment is accessible on the local network (192.168.11.x) but is **not exposed** via Cloudflare Tunnel.

To expose publicly (optional):

1. Edit `~/.cloudflared/config.yml`:
   ```yaml
   - hostname: api-template.iyeska.net
     service: http://localhost:8001
   - hostname: template.iyeska.net
     service: http://localhost:5174
   ```

2. Restart cloudflared:
   ```bash
   sudo systemctl restart cloudflared
   ```

## Related Documentation

- Main server documentation: `/home/guthdx/CLAUDE.md`
- Project README: `/opt/apps/test-deployment/README.md`
- GitHub Repository: https://github.com/guthdx/fastapi-react-postgres-template
