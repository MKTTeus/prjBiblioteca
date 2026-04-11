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
# Copia build do frontend
COPY --from=frontend-builder /app/build ./frontend_build
# Copia dependências Python instaladas
COPY --from=backend-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
# Define o path do backend
ENV PYTHONPATH=/app/backend

# Expõe a porta (Railway usa dinamicamente)
EXPOSE 5000
# conexão com Railway
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port $PORT"]