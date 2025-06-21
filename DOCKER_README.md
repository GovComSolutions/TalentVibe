# TalentVibe Docker Setup

This document provides instructions for running TalentVibe using Docker containers.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)

## Quick Start

### Production Mode

To run the application in production mode:

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### Development Mode

To run the application in development mode with hot reloading:

```bash
# Build and start all services in development mode
docker-compose -f docker-compose.dev.yml up --build

# Or run in background
docker-compose -f docker-compose.dev.yml up -d --build
```

## Services

The application consists of the following services:

- **Backend** (Port 5000): Flask API server with Celery async processing
- **Frontend** (Port 3000): React application
- **Redis** (Port 6379): Message broker for Celery (optional in development)

## Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Redis**: localhost:6379

## Development Workflow

### Making Changes

1. **Backend Changes**: The backend code is mounted as a volume, so changes are reflected immediately
2. **Frontend Changes**: In development mode, React hot reloading will automatically refresh the browser

### Viewing Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This will delete data)
docker-compose down -v
```

## Building Individual Services

```bash
# Build backend only
docker build -f Dockerfile.backend -t talentvibe-backend .

# Build frontend only
docker build -f Dockerfile.frontend -t talentvibe-frontend .

# Build frontend development version
docker build -f Dockerfile.frontend.dev -t talentvibe-frontend-dev .
```

## Environment Variables

### Backend Environment Variables

- `FLASK_ENV`: Set to `production` or `development`
- `FLASK_APP`: Set to `backend.app`
- `FLASK_DEBUG`: Set to `1` for development mode

### Frontend Environment Variables

- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:5000)
- `CHOKIDAR_USEPOLLING`: Set to `true` for Docker development

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Stop any existing services running on ports 3000, 5000, or 6379
2. **Build Failures**: Ensure all dependencies are properly specified in requirements.txt and package.json
3. **Permission Issues**: On Linux/Mac, you might need to run with `sudo` or add your user to the docker group

### Health Checks

The services include health checks to ensure they're running properly:

```bash
# Check service health
docker-compose ps

# View health check logs
docker inspect <container_name>
```

### Database Persistence

- Backend data is persisted in a Docker volume named `backend_data`
- Redis data is persisted in a Docker volume named `redis_data`

To reset the database:

```bash
docker-compose down -v
docker-compose up --build
```

## Production Deployment

For production deployment, consider:

1. Using a reverse proxy (nginx) in front of the services
2. Setting up proper SSL certificates
3. Using environment-specific configuration files
4. Implementing proper logging and monitoring
5. Setting up database backups

## Performance Optimization

- Use multi-stage builds for smaller images
- Implement proper caching strategies
- Consider using Alpine Linux base images for smaller footprint
- Use .dockerignore to exclude unnecessary files
