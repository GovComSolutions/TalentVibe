import pytest
import json
from backend.app import app as flask_app, db
from backend.app import Job, Resume

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
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
    """A test client for the app."""
    return app.test_client()

def test_get_jobs_empty(client):
    """Test /api/jobs endpoint when no jobs exist."""
    response = client.get('/api/jobs')
    assert response.status_code == 200
    assert response.get_json() == []

def test_get_jobs_with_data(client):
    """Test /api/jobs endpoint with existing jobs."""
    # Arrange
    job1 = Job(description="Job 1")
    job2 = Job(description="Job 2")
    db.session.add_all([job1, job2])
    db.session.commit()

    # Act
    response = client.get('/api/jobs')
    data = response.get_json()

    # Assert
    assert response.status_code == 200
    assert len(data) == 2
    assert data[0]['description'] == 'Job 1'
    assert data[1]['description'] == 'Job 2'

def test_get_job_details(client):
    """Test /api/jobs/<id> endpoint."""
    # Arrange
    analysis_data = {"summary": "Great candidate", "overall_rating": 9}
    job = Job(description="Software Engineer")
    resume = Resume(filename="test.pdf", content="Experience...", analysis=json.dumps(analysis_data), job=job)
    db.session.add_all([job, resume])
    db.session.commit()

    # Act
    response = client.get(f'/api/jobs/{job.id}')
    data = response.get_json()

    # Assert
    assert response.status_code == 200
    assert data['id'] == job.id
    assert data['description'] == "Software Engineer"
    assert len(data['resumes']) == 1
    assert data['resumes'][0]['filename'] == "test.pdf"
    assert data['resumes'][0]['analysis']['summary'] == "Great candidate"

def test_get_job_details_not_found(client):
    """Test /api/jobs/<id> for a job that does not exist."""
    response = client.get('/api/jobs/999')
    assert response.status_code == 404 