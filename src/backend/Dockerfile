# Stage 1: build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY public ./public
COPY src ./src
RUN npm ci
RUN npm run build

# Stage 2: backend deps
FROM python:3.12-slim AS backend-builder
WORKDIR /app
COPY src/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: final
FROM python:3.12-slim
WORKDIR /app

# Copia backend
COPY src/backend ./backend
# Copia frontend buildado
COPY --from=frontend-builder /app/build ./frontend_build
# Copia requirements
COPY src/backend/requirements.txt ./requirements.txt
# Instala dependências corretamente
RUN pip install --no-cache-dir -r requirements.txt
# Define path
ENV PYTHONPATH=/app/backend
# Expõe porta
EXPOSE 5000
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port $PORT"]