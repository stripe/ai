FROM ruby:3.2-slim

# NOTE: When integrating into a TAIGA environment, the server directory
# (environment/server/) must NOT be exposed to the agent's working environment.
# The agent should only interact with the server via the browser UI.
# Only environment/client/, environment/PROBLEM.md, and environment/server/submission.json
# should be accessible to the agent.

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

# Create simplified grader Gemfile (no browser automation needed, but keep stripe for evaluations.rb)
RUN echo 'source "https://rubygems.org"\ngem "json"\ngem "dotenv"\ngem "stripe"' > /eval/grader/Gemfile.clean && \
    mv /eval/grader/Gemfile.clean /eval/grader/Gemfile

# Install grader Ruby dependencies
RUN cd /eval/grader && \
    bundle config set --local path 'vendor/bundle' && \
    bundle install

# Copy environment files
COPY environment/ ./environment/

# Install environment server dependencies
RUN cd /eval/environment/server && \
    bundle config set --local path 'vendor/bundle' && \
    bundle install

# Copy solution files
COPY solution/ ./solution/

# Copy and setup run script
COPY run_inside_docker.sh ./
RUN chmod +x run_inside_docker.sh

CMD ["./run_inside_docker.sh"]
