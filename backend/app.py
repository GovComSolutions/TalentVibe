from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from .ai_service import analyze_resume_with_ai

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
    content = db.Column(db.Text, nullable=False)
    analysis = db.Column(db.Text, nullable=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job.id'), nullable=False)

@app.route('/api/analyze', methods=['POST'])
def analyze_resumes():
    if 'resumes' not in request.files:
        return jsonify({'error': 'No resume files found'}), 400

    resumes = request.files.getlist('resumes')
    job_description = request.form.get('jobDescription')

    if not job_description:
        return jsonify({'error': 'No job description provided'}), 400

    # --- Database Logic ---
    new_job = Job(description=job_description)
    db.session.add(new_job)
    db.session.commit()

    analysis_results = []
    for resume_file in resumes:
        if resume_file:
            try:
                resume_content = resume_file.read().decode('utf-8')
            except UnicodeDecodeError:
                # This file is not a readable text file (e.g., PDF, DOCX), so we skip it.
                # In the future, we could add parsers for these formats.
                print(f"Skipping non-text file: {resume_file.filename}")
                continue

            analysis_text = analyze_resume_with_ai(job_description, resume_content)
            
            new_resume = Resume(
                filename=resume_file.filename,
                content=resume_content, 
                job_id=new_job.id,
                analysis=analysis_text
            )
            db.session.add(new_resume)
            analysis_results.append({'filename': resume_file.filename, 'analysis': analysis_text})
    
    db.session.commit()
    # --- End Database Logic ---

    return jsonify({
        'message': 'Successfully analyzed and stored resumes.',
        'job_id': new_job.id,
        'results': analysis_results
    })

@app.route('/api/data')
def get_data():
    return jsonify({'message': 'Hello from the Flask backend!'})

@app.route('/')
def home():
    return "Hello from the Backend!" 