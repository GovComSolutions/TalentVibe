import pytest
from backend.app import app as flask_app, db
from backend.app import Job, Resume
import io
from unittest.mock import patch
import json

@pytest.fixture
def app():
    flask_app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    })
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def test_get_data(client):
    """Test the /api/data endpoint."""
    response = client.get('/api/data')
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data['message'] == 'Hello from the Flask backend!'

@patch('backend.app.analyze_resume_with_ai')
def test_analyze_resumes(mock_analyze_resume, client):
    """Test the /api/analyze endpoint for file upload and DB storage."""
    # Arrange: Mock the return value of the AI analysis to be a JSON string
    mock_analysis = {
        "summary": "Mocked AI Analysis",
        "matched_skills": ["mocking"],
        "missing_skills": [],
        "overall_rating": 10
    }
    mock_analyze_resume.return_value = json.dumps(mock_analysis)

    job_desc = "Test Job Description"
    resume_content = b"This is a test resume."
    
    data = {
        'jobDescription': job_desc,
        'resumes': (io.BytesIO(resume_content), 'test_resume.txt')
    }

    response = client.post('/api/analyze', data=data, content_type='multipart/form-data')
    
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data['message'] == 'Successfully analyzed and stored resumes.'
    assert 'job_id' in json_data
    assert isinstance(json_data['job_id'], int)

    # Verify database content
    job = Job.query.get(json_data['job_id'])
    assert job is not None
    assert job.description == job_desc
    
    assert len(job.resumes) == 1
    resume = job.resumes[0]
    assert resume.filename == 'test_resume.txt'
    
    # Assert that the analysis stored in the DB is the correct JSON string
    assert resume.analysis == json.dumps(mock_analysis) 