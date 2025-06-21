import os
from openai import OpenAI

# Global client instance, initialized to None.
_client = None

def get_client():
    """Initializes and returns the OpenAI client, creating it only if it doesn't exist."""
    global _client
    if _client is None:
        # This code will only run the first time get_client() is called.
        # By this time, the .env file will have been loaded by __main__.py.
        _client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    return _client

def analyze_resume_with_ai(job_description, resume_text):
    """
    Analyzes a single resume against a job description using the OpenAI API,
    returning a rich, structured JSON analysis based on a detailed schema.
    """
    client = get_client()

    prompt = f"""
You are an expert talent acquisition specialist with a keen eye for technical and professional roles. 
Analyze the following resume against the provided job description and return a JSON object that strictly follows the specified schema.

**Output Schema:**
Your entire response MUST be a single JSON object. Do not include any text outside of this JSON.
The JSON must have the following structure:
{{
  "candidate_name": "The full name of the candidate as extracted from the resume.",
  "fit_score": "An integer from 0-100 representing the candidate's overall fit for the role.",
  "bucket": "A string categorizing the candidate. Choose from: '🚀 Green-Room Rocket' (top-tier, >90), '⚡ Book-the-Call' (strong candidate, 80-89), '🛠️ Bench Prospect' (potential but with gaps, 65-79), or '🗄️ Swipe-Left Archive' (not a fit, <65).",
  "reasoning": "A concise, one-sentence explanation for the assigned bucket and score.",
  "summary_points": ["An array of 2-3 string bullet points summarizing the candidate's key strengths and experiences relevant to the job."],
  "skill_matrix": {{
    "matches": ["An array of strings listing skills from the job description that the candidate demonstrably has."],
    "gaps": ["An array of strings listing critical skills from the job description that appear to be missing."]
  }},
  "timeline": [
    {{
      "period": "e.g., 2022-Now",
      "role": "e.g., Sr. ML Eng, Acme AI",
      "details": "A brief but impactful summary of their accomplishment in that role."
    }}
  ],
  "logistics": {{
    "compensation": "Extract desired compensation if available, otherwise 'Not specified'.",
    "notice_period": "Extract notice period if available, otherwise 'Not specified'.",
    "work_authorization": "Extract work authorization if available, otherwise 'Not specified'.",
    "location": "Extract current location or relocation preferences if available, otherwise 'Not specified'."
  }}
}}

---
**Job Description:**
{job_description}
---
**Resume:**
{resume_text}
---
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that provides analysis in a structured JSON format according to the user's schema."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"An error occurred during AI analysis: {e}")
        error_response = {{
            "fit_score": 0,
            "bucket": "Error",
            "reasoning": "An error occurred during analysis.",
            "summary_points": [],
            "skill_matrix": {{"matches": [], "gaps": []}},
            "timeline": [],
            "logistics": {{}}
        }}
        import json
        return json.dumps(error_response) 