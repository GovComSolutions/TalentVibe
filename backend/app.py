from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
import os
from .ai_service import analyze_resume_with_ai
import json
import fitz  # PyMuPDF
import docx  # python-docx
import io
import hashlib
import threading
import time
import queue
from datetime import datetime

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Simple Async Queue Configuration ---
task_queue = queue.Queue()
worker_threads = []
MAX_WORKERS = 2

# --- Database Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'resumes.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    jobs = db.relationship('Job', backref='user', lazy=True)

class Job(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.Text, nullable=False)
    resumes = db.relationship('Resume', backref='job', lazy=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Resume(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(100), nullable=False)
    candidate_name = db.Column(db.String(120), nullable=True)
    content = db.Column(db.Text, nullable=False)
    content_hash = db.Column(db.String(64), nullable=False, index=True)
    analysis = db.Column(db.Text, nullable=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job.id'), nullable=False)

    __table_args__ = (db.UniqueConstraint('job_id', 'filename', name='_job_filename_uc'),
                      db.UniqueConstraint('job_id', 'content_hash', name='_job_hash_uc'))

# Global variables for tracking job completion
job_completion_trackers = {}  # job_id -> {total_resumes, completed_resumes}

# --- WebSocket Events ---
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('status', {'message': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

def emit_progress_update(job_id, message, progress_type='info'):
    """Emit progress updates to connected clients"""
    socketio.emit('progress_update', {
        'job_id': job_id,
        'message': message,
        'type': progress_type,
        'timestamp': time.time()
    })

def check_job_completion(job_id):
    """Check if all resumes for a job are complete and emit completion event"""
    if job_id in job_completion_trackers:
        tracker = job_completion_trackers[job_id]
        tracker['completed_resumes'] += 1
        
        if tracker['completed_resumes'] >= tracker['total_resumes']:
            emit_progress_update(job_id, f"All {tracker['total_resumes']} resumes processed successfully!", 'complete')
            del job_completion_trackers[job_id]  # Clean up tracker

def process_resume_with_progress(job_id, resume_file, job_description):
    """Process a single resume with progress updates"""
    try:
        emit_progress_update(job_id, f"Processing {resume_file.filename}...", 'processing')
        
        content = ""
        filename = resume_file.filename
        file_stream = resume_file.read()

        if filename.endswith('.pdf'):
            emit_progress_update(job_id, f"Reading PDF: {filename}", 'info')
            pdf_doc = fitz.open(stream=file_stream, filetype='pdf')
            for page in pdf_doc:
                content += page.get_text()
            pdf_doc.close()
        elif filename.endswith('.docx'):
            emit_progress_update(job_id, f"Reading DOCX: {filename}", 'info')
            doc = docx.Document(io.BytesIO(file_stream))
            for para in doc.paragraphs:
                content += para.text + '\n'
        else:
            content = file_stream.decode('utf-8')

        if not content.strip():
            emit_progress_update(job_id, f"Skipped {filename}: Empty or unreadable", 'warning')
            return None, 'File is empty or unreadable'

        # Check for duplicates
        content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        existing_by_hash = Resume.query.filter_by(job_id=job_id, content_hash=content_hash).first()
        if existing_by_hash:
            emit_progress_update(job_id, f"Skipped {filename}: Duplicate content", 'warning')
            return None, 'Duplicate content'

        emit_progress_update(job_id, f"Analyzing {filename} with AI...", 'processing')
        analysis_text = analyze_resume_with_ai(job_description, content)
        analysis_json = json.loads(analysis_text)
        
        emit_progress_update(job_id, f"Completed analysis for {filename}", 'success')
        
        # Check if all resumes for this job are complete
        check_job_completion(job_id)
        
        return {
            'filename': filename,
            'candidate_name': analysis_json.get('candidate_name', 'Not Provided'),
            'content': content,
            'content_hash': content_hash,
            'analysis': analysis_text
        }, None
        
    except Exception as e:
        emit_progress_update(job_id, f"Error processing {resume_file.filename}: {str(e)}", 'error')
        
        # Still check completion even on error
        check_job_completion(job_id)
        return None, str(e)

def background_worker():
    """Background worker thread that processes resume analysis tasks"""
    while True:
        try:
            task = task_queue.get(timeout=1)  # 1 second timeout
            if task is None:  # Shutdown signal
                break
                
            job_id, resume_data, job_description = task
            
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
                        continue
                
                # Analyze with AI
                emit_progress_update(job_id, f"Analyzing {filename} with AI...", 'processing')
                analysis_text = analyze_resume_with_ai(job_description, file_content)
                analysis_json = json.loads(analysis_text)
                
                # Save to database
                with app.app_context():
                    new_resume = Resume(
                        filename=filename,
                        candidate_name=analysis_json.get('candidate_name', 'Not Provided'),
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
                
            except Exception as e:
                emit_progress_update(job_id, f"Error processing {resume_data.get('filename', 'Unknown')}: {str(e)}", 'error')
                
                # Still check completion even on error
                check_job_completion(job_id)
                
        except queue.Empty:
            continue
        except Exception as e:
            print(f"Worker thread error: {e}")
            continue

def start_workers():
    """Start background worker threads"""
    for i in range(MAX_WORKERS):
        worker = threading.Thread(target=background_worker, daemon=True)
        worker.start()
        worker_threads.append(worker)
    print(f"Started {MAX_WORKERS} background worker threads")

# Start workers when app initializes
start_workers()

def process_resumes_async(job_id, resumes_data, job_description):
    """Queue resumes for background processing"""
    total_resumes = len(resumes_data)
    emit_progress_update(job_id, f"Queuing {total_resumes} resumes for background processing...", 'queued')
    
    # Initialize completion tracker for this job
    job_completion_trackers[job_id] = {
        'total_resumes': total_resumes,
        'completed_resumes': 0
    }
    
    # Add each resume to the queue
    for resume_data in resumes_data:
        task_queue.put((job_id, resume_data, job_description))
    
    emit_progress_update(job_id, f"All {total_resumes} resumes queued for background processing", 'queued')

@app.route('/api/analyze', methods=['POST'])
def analyze_resumes():
    # --- Temp: Get or create a default user ---
    default_user = User.query.filter_by(username='default_user').first()
    if not default_user:
        default_user = User(username='default_user')
        db.session.add(default_user)
        db.session.commit()
    # --- End Temp ---

    if 'jobDescription' not in request.form:
        return jsonify({'error': 'No job description provided'}), 400

    job_description = request.form['jobDescription']
    resumes = request.files.getlist('resumes')

    # Check if a job with this description already exists FOR THIS USER.
    job = Job.query.filter_by(description=job_description, user_id=default_user.id).first()

    # If it doesn't exist, create a new one for this user.
    if not job:
        job = Job(description=job_description, user_id=default_user.id)
        db.session.add(job)
        db.session.flush()  # Use flush to get the job.id before committing.
        db.session.commit()  # Commit the job to the database

    emit_progress_update(job.id, f"Preparing {len(resumes)} resumes for background processing...", 'start')

    # Prepare resume data for background processing
    resumes_data = []
    for resume_file in resumes:
        if resume_file:
            try:
                content = ""
                filename = resume_file.filename
                file_stream = resume_file.read()

                if filename.endswith('.pdf'):
                    pdf_doc = fitz.open(stream=file_stream, filetype='pdf')
                    for page in pdf_doc:
                        content += page.get_text()
                    pdf_doc.close()
                elif filename.endswith('.docx'):
                    doc = docx.Document(io.BytesIO(file_stream))
                    for para in doc.paragraphs:
                        content += para.text + '\n'
                else:
                    content = file_stream.decode('utf-8')

                if content.strip():
                    resumes_data.append({
                        'filename': filename,
                        'content': content
                    })
                else:
                    emit_progress_update(job.id, f"Skipped {filename}: Empty or unreadable", 'warning')
                    
            except Exception as e:
                emit_progress_update(job.id, f"Error reading {resume_file.filename}: {str(e)}", 'error')

    if not resumes_data:
        emit_progress_update(job.id, "No valid resumes to process", 'warning')
        return jsonify({
            'message': 'No valid resumes to process',
            'job_id': job.id,
            'processed_files': [],
            'skipped_files': [{'filename': f.filename, 'reason': 'Invalid file'} for f in resumes if f]
        })

    # Queue background job
    process_resumes_async(job.id, resumes_data, job_description)

    return jsonify({
        'message': f'Queued {len(resumes_data)} resumes for background processing',
        'job_id': job.id,
        'status': 'queued',
        'total_resumes': len(resumes_data)
    })

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    """Returns a list of all jobs for the current user."""
    # --- Temp: Use default user ---
    default_user = User.query.filter_by(username='default_user').first()
    if not default_user:
        return jsonify([]) # No user, no jobs
    # --- End Temp ---

    jobs = Job.query.filter_by(user_id=default_user.id).order_by(Job.id.desc()).all()
    return jsonify([
        {
            'id': job.id, 
            'description': job.description,
            'resume_count': len(job.resumes)
        } for job in jobs
    ])

@app.route('/api/jobs/<int:job_id>', methods=['GET'])
def get_job_details(job_id):
    """Returns details and resumes for a specific job, checking user ownership."""
    # --- Temp: Use default user ---
    default_user = User.query.filter_by(username='default_user').first()
    if not default_user:
        return jsonify({'error': 'User not found'}), 404
    # --- End Temp ---

    job = Job.query.filter_by(id=job_id, user_id=default_user.id).first_or_404()
    
    resumes_data = [
        {
            'id': resume.id,
            'filename': resume.filename,
            'candidate_name': resume.candidate_name,
            'analysis': json.loads(resume.analysis) if resume.analysis else None
        } 
        for resume in job.resumes
    ]
    return jsonify({
        'id': job.id,
        'description': job.description,
        'resumes': resumes_data
    })

@app.route('/api/jobs/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    """Delete a job and all its associated resumes"""
    # --- Temp: Use default user ---
    default_user = User.query.filter_by(username='default_user').first()
    if not default_user:
        return jsonify({'error': 'User not found'}), 404
    # --- End Temp ---

    job = Job.query.filter_by(id=job_id, user_id=default_user.id).first()
    if not job:
        return jsonify({'error': 'Job not found'}), 404

    try:
        # Get resume count for confirmation
        resume_count = len(job.resumes)
        
        # Delete all associated resumes first (cascade)
        for resume in job.resumes:
            db.session.delete(resume)
        
        # Delete the job
        db.session.delete(job)
        db.session.commit()
        
        return jsonify({
            'message': f'Job "{job.description[:50]}..." deleted successfully',
            'deleted_resumes': resume_count,
            'job_id': job_id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete job: {str(e)}'}), 500

@app.route('/api/data')
def get_data():
    return jsonify({'message': 'Hello from the Flask backend!'})

@app.route('/')
def home():
    return "Hello from the Backend!" 