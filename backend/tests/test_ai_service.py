import pytest
import json
from unittest.mock import patch, MagicMock
from backend.ai_service import analyze_resume_with_ai

@patch('backend.ai_service.get_client')
def test_analyze_resume_with_ai(mock_get_client):
    """
    Tests the analyze_resume_with_ai function to ensure it processes
    a resume and job description and returns a mock JSON analysis.
    """
    # Arrange: Set up the mock response from the OpenAI client
    mock_analysis = {
        "summary": "The candidate is a perfect match.",
        "matched_skills": ["Python"],
        "missing_skills": ["Java"],
        "overall_rating": 9
    }
    mock_response_content = json.dumps(mock_analysis)

    mock_response = MagicMock()
    mock_response.choices[0].message.content = mock_response_content
    
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    
    mock_get_client.return_value = mock_client

    # Act: Call the function with sample data
    job_description = "Seeking a senior Python developer."
    resume_text = "I have 10 years of Python experience."
    result_str = analyze_resume_with_ai(job_description, resume_text)

    # Assert: Verify the result is a JSON string matching the mock analysis
    assert isinstance(result_str, str)
    result_json = json.loads(result_str)
    assert result_json["summary"] == "The candidate is a perfect match."
    assert result_json["matched_skills"] == ["Python"]
    assert result_json["overall_rating"] == 9
    
    # Verify that the OpenAI client was called with the correct model and messages
    mock_client.chat.completions.create.assert_called_once()
    call_args, call_kwargs = mock_client.chat.completions.create.call_args
    assert call_kwargs['model'] == 'gpt-4o'
    assert "Seeking a senior Python developer." in call_kwargs['messages'][1]['content']
    assert "I have 10 years of Python experience." in call_kwargs['messages'][1]['content'] 