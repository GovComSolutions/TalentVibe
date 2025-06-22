from celery import Celery
import json
import hashlib

# --- Self-Contained Celery Application for Local Development ---
# This creates a Celery instance that runs tasks synchronously and in-memory.
# It does NOT require a message broker like Redis or RabbitMQ to be running.
celery_app = Celery(
    'tasks',
    broker_url=None,
    result_backend=None,
    task_always_eager=True
)

@celery_app.task(bind=True)
def process_resume_task(self, job_id, resume_data, job_description):
    """
    Celery task to process a single resume synchronously.
    Imports are done inside the task to avoid circular dependencies at startup.
    """
    from backend.app import app, db, Resume, emit_progress_update, check_job_completion
    from backend.ai_service import analyze_resume_with_ai
    
    with app.app_context():
        try:
            filename = resume_data['filename']
            file_content = resume_data['content']
            
            emit_progress_update(job_id, f"Processing {filename}...", 'processing')
            
            content_hash = hashlib.sha256(file_content.encode('utf-8')).hexdigest()
            existing_by_hash = Resume.query.filter_by(job_id=job_id, content_hash=content_hash).first()
            if existing_by_hash:
                emit_progress_update(job_id, f"Skipped {filename}: Duplicate content", 'warning')
                check_job_completion(job_id)
                return {'status': 'skipped', 'reason': 'duplicate'}
            
            emit_progress_update(job_id, f"Analyzing {filename} with AI...", 'processing')
            analysis_text = analyze_resume_with_ai(job_description, file_content)
            analysis_json = json.loads(analysis_text)
            
            candidate_name = analysis_json.get('candidate_name', 'Not Provided')
            if candidate_name.strip().lower() == 'name not found':
                candidate_name = 'Not Provided'

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
            # Do not retry in synchronous mode, just raise the exception
            raise

@celery_app.task
def process_job_resumes(job_id, resumes_data, job_description):
    """
    Synchronously processes multiple resumes for a job by calling the single-resume task.
    """
    from backend.app import emit_progress_update

    total_resumes = len(resumes_data)
    emit_progress_update(job_id, f"Starting processing of {total_resumes} resumes...", 'start')
    
    for resume_data in resumes_data:
        try:
            # Since we are in eager mode, this will execute immediately
            process_resume_task(job_id, resume_data, job_description)
        except Exception as e:
            # The error is already logged inside process_resume_task
            pass # Continue to the next resume

    emit_progress_update(job_id, f"All {total_resumes} resumes have been submitted and processed.", 'queued')
    
    return {
        'status': 'completed',
        'job_id': job_id,
        'total_tasks': total_resumes
    } 