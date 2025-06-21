# TalentVibe Deployment Guide

This guide covers multiple deployment options for the TalentVibe application.

## Option 1: Docker Deployment (Recommended)

### Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)

### Quick Start with Docker

```bash
# Production mode
docker-compose up --build

# Development mode with hot reloading
docker-compose -f docker-compose.dev.yml up --build
```

### Docker Files Created

- `Dockerfile.backend` - Backend service container
- `Dockerfile.frontend` - Frontend production container
- `Dockerfile.frontend.dev` - Frontend development container
- `docker-compose.yml` - Production orchestration
- `docker-compose.dev.yml` - Development orchestration
- `.dockerignore` - Optimized build context
- `DOCKER_README.md` - Detailed Docker instructions

## Option 2: Local Development Setup (Current)

### Prerequisites

- Python 3.11+
- Node.js 18+
- Virtual environment (FileOrg)

### Backend Setup

```bash
# Activate virtual environment
.\\FileOrg\\Scripts\\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt

# Run backend
python -m backend
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run frontend
npm start
```

### Current Status

✅ **Backend**: Running on http://127.0.0.1:5000 and http://192.168.0.67:5000
✅ **Frontend**: Running on http://localhost:3000
✅ **Celery**: Async processing with in-memory broker
✅ **WebSocket**: Real-time progress updates

## Option 3: Production Deployment

### Traditional Server Deployment

#### Backend Deployment

1. **Server Requirements**:

   - Ubuntu 20.04+ or CentOS 8+
   - Python 3.11+
   - Nginx
   - Gunicorn or uWSGI

2. **Setup Steps**:

   ```bash
   # Install system dependencies
   sudo apt update
   sudo apt install python3-pip python3-venv nginx

   # Create virtual environment
   python3 -m venv talentvibe-env
   source talentvibe-env/bin/activate

   # Install Python dependencies
   pip install -r backend/requirements.txt
   pip install gunicorn

   # Run with Gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 backend.app:app
   ```

3. **Nginx Configuration**:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

#### Frontend Deployment

1. **Build for Production**:

   ```bash
   cd frontend
   npm run build
   ```

2. **Serve with Nginx**:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       root /path/to/frontend/build;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://127.0.0.1:5000;
       }
   }
   ```

### Cloud Deployment Options

#### Heroku

1. **Backend**:

   ```bash
   # Create Procfile
   echo "web: gunicorn backend.app:app" > Procfile

   # Deploy
   heroku create talentvibe-backend
   git push heroku main
   ```

2. **Frontend**:
   ```bash
   # Build and deploy
   npm run build
   heroku create talentvibe-frontend
   git push heroku main
   ```

#### AWS

1. **EC2 Instance**:

   - Launch Ubuntu instance
   - Follow traditional server deployment steps
   - Use AWS RDS for database (if needed)

2. **ECS/Fargate**:
   - Use provided Docker files
   - Create ECS cluster
   - Deploy as containerized services

#### Google Cloud Platform

1. **App Engine**:

   - Deploy backend to App Engine
   - Deploy frontend to App Engine (static files)

2. **Cloud Run**:
   - Use provided Docker files
   - Deploy as containerized services

## Environment Configuration

### Backend Environment Variables

```bash
FLASK_ENV=production
FLASK_APP=backend.app
DATABASE_URL=sqlite:///talentvibe.db
ANTHROPIC_API_KEY=your_api_key_here
```

### Frontend Environment Variables

```bash
REACT_APP_API_URL=http://your-backend-domain.com
REACT_APP_WS_URL=ws://your-backend-domain.com
```

## Security Considerations

### Production Security Checklist

- [ ] Use HTTPS/SSL certificates
- [ ] Implement proper CORS configuration
- [ ] Set up firewall rules
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular security updates
- [ ] Database backup strategy

### SSL/HTTPS Setup

```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring and Logging

### Application Monitoring

- **Backend**: Flask logging, Celery monitoring
- **Frontend**: React error boundaries, performance monitoring
- **Infrastructure**: Server monitoring, database monitoring

### Log Management

```bash
# View application logs
tail -f /var/log/talentvibe/app.log

# View nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Performance Optimization

### Backend Optimization

- Use Redis for Celery broker (production)
- Implement database connection pooling
- Add caching layer (Redis)
- Optimize database queries

### Frontend Optimization

- Code splitting and lazy loading
- Image optimization
- CDN for static assets
- Service worker for caching

## Backup and Recovery

### Database Backup

```bash
# SQLite backup
cp talentvibe.db talentvibe.db.backup

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp talentvibe.db "backups/talentvibe_$DATE.db"
```

### Application Backup

- Source code version control
- Configuration files backup
- Static assets backup

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Check if ports 3000, 5000, 6379 are available
2. **Permission Issues**: Ensure proper file permissions
3. **Database Issues**: Check database file permissions and integrity
4. **Network Issues**: Verify firewall and network configuration

### Debug Commands

```bash
# Check service status
systemctl status talentvibe-backend
systemctl status talentvibe-frontend

# View logs
journalctl -u talentvibe-backend -f
journalctl -u talentvibe-frontend -f

# Check network connectivity
netstat -tulpn | grep :5000
netstat -tulpn | grep :3000
```

## Next Steps

1. **Choose Deployment Option**: Based on your infrastructure and requirements
2. **Set Up Environment**: Configure production environment variables
3. **Deploy Application**: Follow the chosen deployment method
4. **Configure Monitoring**: Set up logging and monitoring
5. **Security Hardening**: Implement security best practices
6. **Performance Tuning**: Optimize based on usage patterns
7. **Backup Strategy**: Implement automated backup procedures
