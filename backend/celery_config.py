from celery import Celery
import os

# Create Celery instance
celery_app = Celery('talentvibe')

# Try to use Redis, fallback to in-memory broker if not available
try:
    # Test Redis connection
    import redis
    r = redis.Redis(host='localhost', port=6379, db=0)
    r.ping()
    broker_url = 'redis://localhost:6379/0'
    result_backend = 'redis://localhost:6379/0'
    print("✅ Redis connection successful - using Redis broker")
except Exception as e:
    print(f"⚠️  Redis not available ({e}) - using in-memory broker")
    broker_url = 'memory://'
    result_backend = 'rpc://'

# Configure Celery
celery_app.conf.update(
    broker_url=broker_url,
    result_backend=result_backend,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Auto-discover tasks
celery_app.autodiscover_tasks(['backend'])

if __name__ == '__main__':
    celery_app.start() 