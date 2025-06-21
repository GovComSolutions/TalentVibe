#!/usr/bin/env python
"""
Script to start the Celery worker for TalentVibe
"""
import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from celery_config import celery_app

if __name__ == '__main__':
    # Start the Celery worker
    celery_app.worker_main(['worker', '--loglevel=info', '--concurrency=2']) 