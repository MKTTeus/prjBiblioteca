# Stage 1: build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY public ./public
COPY src ./src
RUN npm ci
RUN npm run build

# Stage 2: build FastAPI backend dependencies
FROM python:3.12-slim AS backend-builder
WORKDIR /app
COPY src/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: final image
FROM python:3.12-slim
WORKDIR /app

# Copy backend server code
COPY src/backend ./backend

# Copy frontend build to a static folder served by backend (if needed)
COPY --from=frontend-builder /app/build ./frontend_build

# Re-install needed Python deps
COPY --from=backend-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

# Environment
ENV PYTHONPATH=/app/backend
ENV PORT=5000

EXPOSE 5000

# Run uvicorn (FastAPI app in src/backend/main.py)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
