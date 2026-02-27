FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

# System dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /eval

# Install Python dependencies for server and grader
RUN pip install --no-cache-dir \
    flask \
    stripe \
    pytest \
    pytest-json-report \
    python-dotenv

# Copy grader files
COPY grader/ ./grader/

# Copy environment and solution files
COPY environment/ ./environment/
COPY solution/ ./solution/

CMD ["bash"]
