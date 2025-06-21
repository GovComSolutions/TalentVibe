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
    returning a structured JSON analysis.
    """
    client = get_client()

    prompt = f"""
    You are an expert hiring manager. Analyze the following resume based on the provided job description. 
    Your response MUST be a JSON object with the following structure:
    {{
      "summary": "A one-sentence summary of the candidate's suitability.",
      "matched_skills": ["A list of key skills from the job description that the candidate possesses."],
      "missing_skills": ["A list of key skills from the job description that the candidate appears to be missing."],
      "overall_rating": "A rating on a scale of 1-10, where 10 is a perfect match."
    }}

    Job Description:
    ---
    {job_description}
    ---

    Resume:
    ---
    {resume_text}
    ---
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that provides analysis in JSON format."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"An error occurred during AI analysis: {e}")
        return '{ "summary": "Error during analysis.", "matched_skills": [], "missing_skills": [], "overall_rating": 0 }' 