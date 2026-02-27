FROM ruby:3.2-slim

ENV DEBIAN_FRONTEND=noninteractive

# System dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /eval

# Copy grader files first (for layer caching)
COPY grader/ ./grader/

# Install grader Ruby dependencies system-wide
RUN cd /eval/grader && bundle install

# Copy environment files
COPY environment/ ./environment/

# Install environment server dependencies system-wide
RUN cd /eval/environment/server && bundle install

# Copy solution files
COPY solution/ ./solution/

# Install solution server dependencies system-wide
RUN cd /eval/solution/server && bundle install

# Copy and setup run script
COPY run_inside_docker.sh ./
RUN chmod +x run_inside_docker.sh

CMD ["./run_inside_docker.sh"]
