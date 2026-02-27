FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# System dependencies (excluding firefox which needs PPA)
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    ca-certificates \
    python3 \
    python3-pip \
    xvfb \
    software-properties-common \
    procps \
    psmisc \
    && rm -rf /var/lib/apt/lists/*

# Install Firefox from Mozilla PPA (firefox-esr not available in Ubuntu 22.04)
RUN add-apt-repository -y ppa:mozillateam/ppa \
    && echo 'Package: *\nPin: release o=LP-PPA-mozillateam\nPin-Priority: 1001' > /etc/apt/preferences.d/mozilla-firefox \
    && apt-get update \
    && apt-get install -y firefox \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install MongoDB (supports both amd64 and arm64)
RUN wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add - \
    && echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list \
    && apt-get update \
    && apt-get install -y mongodb-org \
    && rm -rf /var/lib/apt/lists/*

# Install geckodriver for Selenium (architecture-aware)
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then \
        GECKODRIVER_URL="https://github.com/mozilla/geckodriver/releases/download/v0.35.0/geckodriver-v0.35.0-linux64.tar.gz"; \
    elif [ "$ARCH" = "arm64" ]; then \
        GECKODRIVER_URL="https://github.com/mozilla/geckodriver/releases/download/v0.35.0/geckodriver-v0.35.0-linux-aarch64.tar.gz"; \
    else \
        echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    wget -q "$GECKODRIVER_URL" -O /tmp/geckodriver.tar.gz && \
    tar -xzf /tmp/geckodriver.tar.gz -C /usr/local/bin && \
    rm /tmp/geckodriver.tar.gz && \
    chmod +x /usr/local/bin/geckodriver

# Set environment variables for Firefox/Selenium
ENV FIREFOX_PATH=/usr/bin/firefox
ENV GECKODRIVER_PATH=/usr/local/bin/geckodriver
ENV DISPLAY=:99

WORKDIR /eval

# Copy grader requirements and install
COPY grader/requirements.txt ./grader/requirements.txt
RUN pip3 install -r grader/requirements.txt

# Copy eval files
COPY environment/ ./environment/
COPY grader/ ./grader/
COPY solution/ ./solution/

# Install Node.js dependencies
RUN cd environment && npm install

# Copy run script
COPY run_inside_docker.sh ./
RUN chmod +x run_inside_docker.sh
RUN chmod +x grader/payments_submit.sh

CMD ["./run_inside_docker.sh"]
