from celery import shared_task
from .celery_config import celery_app
import json
import hashlib

def get_app_objects():
    from backend.app import app, db, Resume, emit_progress_update, check_job_completion
    from backend.ai_service import analyze_resume_with_ai
    return app, db, Resume, emit_progress_update, check_job_completion, analyze_resume_with_ai

@shared_task(bind=True)
def process_resume_task(self, job_id, resume_data, job_description):
    """
    Celery task to process a single resume asynchronously
    """
    app, db, Resume, emit_progress_update, check_job_completion, analyze_resume_with_ai = get_app_objects()
    try:
        filename = resume_data['filename']
        file_content = resume_data['content']
        
        # Update progress
        emit_progress_update(job_id, f"Processing {filename}...", 'processing')
        
        # Check for duplicates
        content_hash = hashlib.sha256(file_content.encode('utf-8')).hexdigest()
        with app.app_context():
            existing_by_hash = Resume.query.filter_by(job_id=job_id, content_hash=content_hash).first()
            if existing_by_hash:
                emit_progress_update(job_id, f"Skipped {filename}: Duplicate content", 'warning')
                check_job_completion(job_id)
                return {'status': 'skipped', 'reason': 'duplicate'}
        
        # Analyze with AI
        emit_progress_update(job_id, f"Analyzing {filename} with AI...", 'processing')
        analysis_text = analyze_resume_with_ai(job_description, file_content)
        analysis_json = json.loads(analysis_text)
        
        # Handle case where AI returns "Name Not Found"
        candidate_name = analysis_json.get('candidate_name', 'Not Provided')
        if candidate_name.strip().lower() == 'name not found':
            candidate_name = 'Not Provided'

        # Save to database
        with app.app_context():
            new_resume = Resume(
                filename=filename,
                candidate_name=candidate_name,
                content=file_content,
                content_hash=content_hash,
                job_id=job_id,
                analysis=analysis_text
            )
            db.session.add(new_resume)
            db.session.commit()
        
        emit_progress_update(job_id, f"Completed analysis for {filename}", 'success')
        
        # Check if all resumes for this job are complete
        check_job_completion(job_id)
        
        return {
            'status': 'success',
            'filename': filename,
            'candidate_name': candidate_name
        }
        
    except Exception as e:
        error_msg = f"Error processing {resume_data.get('filename', 'Unknown')}: {str(e)}"
        emit_progress_update(job_id, error_msg, 'error')
        check_job_completion(job_id)
        
        # Re-raise the exception for Celery to handle
        raise self.retry(countdown=60, max_retries=3, exc=e)

@shared_task
def process_job_resumes(job_id, resumes_data, job_description):
    """
    Celery task to process multiple resumes for a job
    """
    app, db, Resume, emit_progress_update, check_job_completion, analyze_resume_with_ai = get_app_objects()
    try:
        total_resumes = len(resumes_data)
        emit_progress_update(job_id, f"Starting processing of {total_resumes} resumes...", 'start')
        
        # Submit individual tasks for each resume
        tasks = []
        for resume_data in resumes_data:
            task = process_resume_task.delay(job_id, resume_data, job_description)
            tasks.append(task)
        
        emit_progress_update(job_id, f"All {total_resumes} resumes submitted for processing", 'queued')
        
        return {
            'status': 'submitted',
            'job_id': job_id,
            'total_tasks': len(tasks),
            'task_ids': [task.id for task in tasks]
        }
        
    except Exception as e:
        error_msg = f"Error submitting job {job_id}: {str(e)}"
        emit_progress_update(job_id, error_msg, 'error')
        raise 