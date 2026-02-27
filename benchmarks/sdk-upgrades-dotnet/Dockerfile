FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# System dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    netcat \
    procps \
    ruby \
    ruby-dev \
    ruby-bundler \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install .NET 8.0 SDK from Microsoft
RUN wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    rm packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y dotnet-sdk-8.0 && \
    rm -rf /var/lib/apt/lists/*

# Create NuGet cache directory
RUN mkdir -p /root/.nuget

WORKDIR /eval

# Copy grader files
COPY grader/ ./grader/

# Install grader Ruby dependencies
RUN cd /eval/grader && \
    bundle config set --local path 'vendor/bundle' && \
    bundle install

# Copy environment and solution files
COPY environment/ ./environment/
COPY solution/ ./solution/

# Pre-restore each problem (downloads NuGet packages)
RUN set -eux; \
    for problem in charges-on-payment-intent invoice-partial-payments subscription-billing-migration; do \
        if [ -d /eval/environment/$problem/server ]; then \
            cd /eval/environment/$problem/server; \
            dotnet restore || true; \
        fi \
    done

# Prefetch target Stripe SDK (v48.x) for offline use
RUN set -eux; \
    TMP_DIR="$(mktemp -d)"; \
    dotnet new console --framework net8.0 --output "$TMP_DIR/prefetch" > /dev/null; \
    cd "$TMP_DIR/prefetch"; \
    dotnet add package Stripe.net --version 48.0.0 > /dev/null; \
    dotnet restore --packages /root/.nuget/packages > /dev/null; \
    rm -rf "$TMP_DIR"

# Copy and setup run script
COPY run_inside_docker.sh ./
RUN chmod +x run_inside_docker.sh

CMD ["./run_inside_docker.sh"]
