from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from .ai_service import analyze_resume_with_ai
import json
import fitz  # PyMuPDF
import docx  # python-docx
import io
import hashlib

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

# --- Database Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'resumes.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Database Models ---
class Job(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.Text, nullable=False)
    resumes = db.relationship('Resume', backref='job', lazy=True)

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

@app.route('/api/analyze', methods=['POST'])
def analyze_resumes():
    if 'jobDescription' not in request.form:
        return jsonify({'error': 'No job description provided'}), 400

    job_description = request.form['jobDescription']
    resumes = request.files.getlist('resumes')

    # Check if a job with this description already exists.
    job = Job.query.filter_by(description=job_description).first()

    # If it doesn't exist, create a new one.
    if not job:
        job = Job(description=job_description)
        db.session.add(job)
        db.session.flush()  # Use flush to get the job.id before committing.

    analysis_results = []
    processed_files = []
    skipped_files = []

    for resume_file in resumes:
        if resume_file:
            content = ""
            try:
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
                        content += para.text + '\\n'
                else:
                    content = file_stream.decode('utf-8')

            except Exception as e:
                print(f"Skipping file {resume_file.filename} due to an error: {e}")
                skipped_files.append({'filename': resume_file.filename, 'reason': 'Error reading file.'})
                continue

            if not content.strip():
                print(f"Skipping file {resume_file.filename} because it is empty or could not be read.")
                skipped_files.append({'filename': resume_file.filename, 'reason': 'File is empty or unreadable.'})
                continue

            # Check for duplicates by filename for this job
            existing_by_filename = Resume.query.filter_by(job_id=job.id, filename=resume_file.filename).first()
            if existing_by_filename:
                print(f"Skipping duplicate file (by name): {resume_file.filename} for job {job.id}")
                skipped_files.append({'filename': resume_file.filename, 'reason': 'Duplicate filename for this job.'})
                continue

            # Check for duplicates by content hash for this job
            content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
            existing_by_hash = Resume.query.filter_by(job_id=job.id, content_hash=content_hash).first()
            if existing_by_hash:
                print(f"Skipping duplicate file (by content): {resume_file.filename} for job {job.id}")
                skipped_files.append({'filename': resume_file.filename, 'reason': 'Duplicate content for this job.'})
                continue

            analysis_text = analyze_resume_with_ai(job_description, content)
            analysis_json = json.loads(analysis_text)
            
            new_resume = Resume(
                filename=resume_file.filename,
                candidate_name=analysis_json.get('candidate_name', 'Unknown'),
                content=content, 
                content_hash=content_hash,
                job_id=job.id,
                analysis=analysis_text
            )
            db.session.add(new_resume)
            analysis_results.append({'filename': resume_file.filename, 'analysis': analysis_text})
            processed_files.append(resume_file.filename)
    
    db.session.commit()

    return jsonify({
        'message': f'Processed {len(processed_files)} resumes, skipped {len(skipped_files)}.',
        'job_id': job.id,
        'processed_files': processed_files,
        'skipped_files': skipped_files,
        'results': analysis_results
    })

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    """Returns a list of all jobs."""
    jobs = Job.query.order_by(Job.id.desc()).all()
    return jsonify([
        {
            'id': job.id, 
            'description': job.description,
            'resume_count': len(job.resumes)
        } for job in jobs
    ])

@app.route('/api/jobs/<int:job_id>', methods=['GET'])
def get_job_details(job_id):
    """Returns details and resumes for a specific job."""
    job = Job.query.get_or_404(job_id)
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

@app.route('/api/data')
def get_data():
    return jsonify({'message': 'Hello from the Flask backend!'})

@app.route('/')
def home():
    return "Hello from the Backend!" 