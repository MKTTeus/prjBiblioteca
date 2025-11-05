
````
# Full Stack Project

This project is a full stack application with a React frontend and a Python/FastAPI backend applied in a school library system, Follow the instructions below to set up and run both parts of the project.

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
````

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install all required Python packages.

### 3. Run the Backend Server

Before starting the frontend, you need to start the backend server:

```bash
uvicorn Register:app --reload --port 5000
```

* This runs the backend on port `5000` using **Uvicorn** in reload mode.
* The reload mode automatically applies changes when you modify the code.
* Make sure this server is running **before running the frontend**.

---

## Frontend Setup (React)

### 1. Navigate to the Frontend Folder

```bash
cd ..\frontend\   # Adjust this path if your frontend folder is elsewhere
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Frontend

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app. The page will reload automatically when you make changes.

---

## Learn More

* Python dependency management: [https://pip.pypa.io/en/stable/](https://pip.pypa.io/en/stable/)
* Backend development with FastAPI: [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)
* Frontend development with React: [https://reactjs.org/](https://reactjs.org/)
* Running Uvicorn server: [https://www.uvicorn.org/](https://www.uvicorn.org/)

---

## Notes

* Always start the backend first with Uvicorn before running `npm start` for the frontend.
* Use reload mode (`--reload`) during development for automatic updates.
* Make sure ports `5000` (backend) and `3000` (frontend) are free.

---


## project over view
<img width="1789" height="914" alt="image" src="https://github.com/user-attachments/assets/4f1ffaa6-08b4-4a0c-9284-1cba13da3b5a" />
---
