# ==============================================================================
# Azal AI - Multi-Stage Production Dockerfile
# ==============================================================================

# Stage 1: Build React 19 Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web

COPY web/package*.json ./
RUN npm ci

COPY web/ ./
RUN npm run build

# Stage 2: Production Python Backend
FROM python:3.11-slim AS runner

WORKDIR /app

# Prevent Python from writing .pyc and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY agents/ ./agents/
COPY api/ ./api/
COPY config/ ./config/
COPY data/ ./data/
COPY storage/ ./storage/
COPY infra/ ./infra/
COPY pyproject.toml ./

# Copy built frontend assets from stage 1 into web/dist
COPY --from=frontend-builder /app/web/dist ./web/dist

# Expose FastAPI backend port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start FastAPI server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
