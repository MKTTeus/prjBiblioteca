# Full Stack Project

This project is a full stack application with a React frontend and a Python/FastAPI backend applied in a school library system. Follow the instructions below to set up and run both parts of the project.

---

## Prerequisites

Make sure you have the following installed on your machine:

- Node.js and npm for the frontend
- Python and pip for the backend
- Uvicorn for running the FastAPI server

---

## Backend Setup (Python / FastAPI)

### 1. Navigate to the Backend Folder

```bash
# Navigate to the src folder
cd .\src\

# Navigate to the backend folder
cd .\backend\

2. Install Dependencies

pip install -r requirements.txt

This will install all required Python packages.
3. Create and Activate a Virtual Environment

Inside the backend folder, create a virtual environment and activate it:

# Create a virtual environment named 'venv'
python -m venv venv

# Activate the virtual environment (Windows)
.\venv\Scripts\activate || .\venv\Scripts\Activate.ps1 || . .\venv\Scripts\Activate.ps1 (dot-sourced)

    This ensures your backend dependencies are isolated from your global Python environment.
    # 1.1 if you receive errors on ExecutionPolicy try
Set-ExecutionPolicy -Scope
 Process -ExecutionPolicy Bypass -Force
    # 1.2  if Venv dosent exist try
python -m venv venv
.\venv\Scripts\Activate.ps1
    # 1.3 if any errors heppens try instlling dependencies again
python -m pip install --upgrade pip
python -m pip install -r .\requirements.txt
    
4. Run the Backend Server

Before starting the frontend, you need to start the backend server:

uvicorn main:app --reload --port 5000

    This runs the backend on port 5000 using Uvicorn in reload mode.

    The reload mode automatically applies changes when you modify the code.

    Make sure this server is running before running the frontend.

Frontend Setup (React)
1. Navigate to the Frontend Folder

cd ..\frontend\   # Adjust this path if your frontend folder is elsewhere

2. Install Dependencies

npm install

3. Run the Frontend

npm start

Open http://localhost:3000

in your browser to view the app. The page will reload automatically when you make changes.
Learn More

    Python dependency management: https://pip.pypa.io/en/stable/

Backend development with FastAPI: https://fastapi.tiangolo.com/

Frontend development with React: https://reactjs.org/

Running Uvicorn server: https://www.uvicorn.org/
Notes

    Always start the backend first with Uvicorn before running npm start for the frontend.

    Use reload mode (--reload) during development for automatic updates.

    Make sure ports 5000 (backend) and 3000 (frontend) are free.

Project Overview
```
<img width="1789" height="914" alt="image" src="https://github.com/user-attachments/assets/4f1ffaa6-08b4-4a0c-9284-1cba13da3b5a" /> 
