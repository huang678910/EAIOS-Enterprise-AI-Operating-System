FROM python:3.12-slim

WORKDIR /app

# System dependencies for psycopg2 and sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Pre-download embedding model to warm cache
ENV SENTENCE_TRANSFORMERS_HOME=/app/model_cache

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-load embedding model during build
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-zh-v1.5')" || true

COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
