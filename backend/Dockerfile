FROM python:3.12-slim

WORKDIR /app

# Use Aliyun Debian mirror for faster apt in China, then install minimal deps
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Use Tsinghua mirror for faster downloads in China; install CPU-only PyTorch first to skip ~1.5GB CUDA deps
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p uploads

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info"]
