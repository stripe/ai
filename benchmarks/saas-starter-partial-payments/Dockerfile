FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# System deps
RUN apt-get update && apt-get install -y \
    curl wget gnupg ca-certificates \
    python3 python3-pip \
    xvfb software-properties-common \
    procps psmisc sudo \
    postgresql postgresql-contrib \
    && rm -rf /var/lib/apt/lists/*

# Firefox from Mozilla PPA (same as furever)
RUN add-apt-repository -y ppa:mozillateam/ppa \
    && echo 'Package: *\nPin: release o=LP-PPA-mozillateam\nPin-Priority: 1001' > /etc/apt/preferences.d/mozilla-firefox \
    && apt-get update && apt-get install -y firefox \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# pnpm
RUN npm install -g pnpm

# geckodriver (architecture-aware, same as furever)
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then \
        GECKODRIVER_URL="https://github.com/mozilla/geckodriver/releases/download/v0.35.0/geckodriver-v0.35.0-linux64.tar.gz"; \
    elif [ "$ARCH" = "arm64" ]; then \
        GECKODRIVER_URL="https://github.com/mozilla/geckodriver/releases/download/v0.35.0/geckodriver-v0.35.0-linux-aarch64.tar.gz"; \
    fi && \
    wget -q "$GECKODRIVER_URL" -O /tmp/geckodriver.tar.gz && \
    tar -xzf /tmp/geckodriver.tar.gz -C /usr/local/bin && rm /tmp/geckodriver.tar.gz

ENV DISPLAY=:99

WORKDIR /eval

# Copy and install grader requirements
COPY grader/requirements.txt ./grader/requirements.txt
RUN pip3 install -r grader/requirements.txt

# Copy eval files
COPY environment/ ./environment/
COPY grader/ ./grader/
COPY solution/ ./solution/

# Install Node dependencies only (build happens at runtime with real env vars)
RUN cd environment && pnpm install

COPY run_inside_docker.sh ./
RUN chmod +x run_inside_docker.sh

CMD ["./run_inside_docker.sh"]
