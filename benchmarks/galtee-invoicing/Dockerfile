FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# System deps
RUN apt-get update && apt-get install -y \
    curl \
    nodejs \
    npm \
    ruby \
    ruby-dev \
    build-essential \
    sqlite3 \
    libsqlite3-dev \
    netcat \
    && rm -rf /var/lib/apt/lists/*

RUN gem install bundler

WORKDIR /eval

# Copy Gemfile and install Ruby deps first (for caching)
COPY Gemfile ./
RUN bundle install

# Copy eval files
COPY environment/ ./environment/
COPY grader/ ./grader/
COPY solution/ ./solution/

# Install Node deps
RUN cd environment/server && npm install

# Copy run script
COPY run_inside_docker.sh ./
RUN chmod +x run_inside_docker.sh

CMD ["./run_inside_docker.sh"]
