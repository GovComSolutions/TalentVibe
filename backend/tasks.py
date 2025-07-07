import json
import hashlib
import time
import concurrent.futures
from celery import Celery
from flask_socketio import emit
from backend.ai_service import analyze_resume_with_ai

# This setup is for local development. It runs tasks synchronously in-memory
# without needing an external message broker like Redis.
celery_app = Celery('tasks', broker='memory://', backend='rpc://')
celery_app.conf.update(task_always_eager=True)

def analyze_resume_in_worker(resume_data, job_description):
    """
    This is the only function that runs in a parallel worker thread.
    It is completely decoupled from the Flask app and database.
    Its only job is to call the AI service and return data.
    """
    filename = resume_data.get('filename')
    content = resume_data.get('content')
    
    # Perform the CPU/network-bound analysis
    analysis_json = analyze_resume_with_ai(content, job_description)
    
    # Return a dictionary with all data needed by the main thread
    return {
        'filename': filename,
        'content': content,
        'analysis_json': analysis_json,
    }

@celery_app.task
def process_job_resumes(job_id, resumes_data, job_description):
    """
    Processes multiple resumes for a job in parallel using a thread pool,
    then commits all successful results to the database in a single transaction on the main thread.
    """
    # These imports MUST be inside the function to avoid circular dependencies
    # and to ensure they are accessed only by the main thread.
    from backend.app import app, db, Resume, emit_progress_update, check_job_completion

    with app.app_context():
        total_resumes = len(resumes_data)
        emit_progress_update(job_id, f"Starting parallel processing of {total_resumes} resumes...", 'start')

        future_to_resume = {}
        analyzed_results = []
        skipped_files = []

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            # Submit analysis tasks to the thread pool
            future_to_resume = {
                executor.submit(analyze_resume_in_worker, rd, job_description): rd 
                for rd in resumes_data
            }
            
            for future in concurrent.futures.as_completed(future_to_resume):
                try:
                    # Get the result from the worker thread
                    result_data = future.result()
                    analyzed_results.append(result_data)
                    emit_progress_update(job_id, f"Completed analysis for {result_data['filename']}", 'success')
                except Exception as exc:
                    original_resume_data = future_to_resume[future]
                    error_filename = original_resume_data.get('filename', 'unknown file')
                    emit_progress_update(job_id, f"Error processing {error_filename}: {exc}", 'error')
                    skipped_files.append({'status': 'error', 'filename': error_filename, 'reason': str(exc)})

        # --- DATABASE OPERATIONS ON MAIN THREAD ONLY ---
        if analyzed_results:
            emit_progress_update(job_id, f"Collating {len(analyzed_results)} successful analyses for database commit...", 'info')
            
            new_resumes_to_add = []
            for res_data in analyzed_results:
                analysis_data = json.loads(res_data['analysis_json'])

                # Log raw AI output for debugging
                with open('ai_analysis_debug.log', 'a', encoding='utf-8') as logf:
                    logf.write(f"{res_data['filename']}\n{json.dumps(analysis_data, ensure_ascii=False)}\n\n")

                # Assign bucket strictly in Python
                fit_score = analysis_data.get('fit_score')
                if fit_score is not None:
                    if fit_score > 90:
                        bucket = '🚀 Green-Room Rocket'
                    elif 80 <= fit_score <= 89:
                        bucket = '⚡ Book-the-Call'
                    elif 65 <= fit_score <= 79:
                        bucket = '🛠️ Bench Prospect'
                    else:
                        bucket = '🗄️ Swipe-Left Archive'
                    analysis_data['bucket'] = bucket
                else:
                    bucket = 'Unknown'

                # Log fit_score and assigned bucket
                with open('ai_analysis_debug.log', 'a', encoding='utf-8') as logf:
                    logf.write(f"BUCKET_ASSIGN: {res_data['filename']} | fit_score: {fit_score} | bucket: {bucket}\n")

                if analysis_data.get('error'):
                    emit_progress_update(job_id, f"Skipping save for {res_data['filename']} due to AI error: {analysis_data.get('error_details')}", 'warning')
                    skipped_files.append({'status': 'error', 'filename': res_data['filename'], 'reason': analysis_data.get('error_details')})
                    continue

                candidate_name = analysis_data.get("candidate_name", "Not provided")
                if not candidate_name or candidate_name.strip().lower() == 'not provided':
                    candidate_name = res_data['filename'].split('.')[0].replace('_', ' ').replace('-', ' ')

                new_resume = Resume(
                    filename=res_data['filename'],
                    candidate_name=candidate_name,
                    content=res_data['content'],
                    content_hash=hashlib.sha256(res_data['content'].encode('utf-8')).hexdigest(),
                    analysis=json.dumps(analysis_data, ensure_ascii=False),
                    job_id=job_id
                )
                new_resumes_to_add.append(new_resume)
            
            if new_resumes_to_add:
                try:
                    db.session.add_all(new_resumes_to_add)
                    db.session.commit()
                    emit_progress_update(job_id, f"Successfully saved {len(new_resumes_to_add)} new resumes to the database.", 'success')
                except Exception as e:
                    db.session.rollback()
                    emit_progress_update(job_id, f"Database commit failed: {e}", 'error')
                    # Add all resumes that failed to commit to the skipped list
                    for r in new_resumes_to_add:
                        skipped_files.append({'status': 'error', 'filename': r.filename, 'reason': f'Database commit failed: {e}'})


        final_success_count = len(analyzed_results) - len(skipped_files)
        if skipped_files:
            emit_progress_update(job_id, f"Finished processing. {final_success_count}/{total_resumes} resumes saved. Skipped: {', '.join(skipped_files)}", 'complete')
        else:
            emit_progress_update(job_id, f"Finished processing. {final_success_count}/{total_resumes} resumes saved.", 'complete')
        check_job_completion(job_id)

# Celery tasks no longer needed for direct parallel execution logic
# You can keep the celery_app instance if it's used elsewhere or for future features,
# but the functions below are now standard Python functions called directly.
# We are keeping the @celery_app.task decorator on process_job_resumes
# because it's called with .delay() (or just called directly in eager mode)
# from app.py and removing it would require changing the call signature there. 