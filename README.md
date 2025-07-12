# TalentVibe-backup

## Overview

TalentVibe-backup is a project designed to manage and streamline talent acquisition, interview feedback, and job management. It features a backend (Python) and a frontend (React) for a complete end-to-end solution.

## Features

- Job posting and management
- Interview scheduling and feedback
- File uploads and document management
- Dashboard for analytics and reporting

## Project Structure

```
TalentVibe-backup/
  backend/      # Python FastAPI backend
  frontend/     # React frontend
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn
- Docker (optional, for containerized deployment)

### Backend Setup

1. Navigate to the backend directory:
   ```sh
   cd backend
   ```
2. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
3. Run the backend server:
   ```sh
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```sh
   cd frontend
   ```
2. Install dependencies:
   ```sh
   npm install
   # or
   yarn install
   ```
3. Start the frontend server:
   ```sh
   npm start
   # or
   yarn start
   ```

### Docker Deployment

- Use the provided `docker-compose.yml` to run both frontend and backend in containers:
  ```sh
  docker-compose up --build
  ```

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
