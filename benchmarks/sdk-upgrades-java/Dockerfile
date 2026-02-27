FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# System dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    netcat \
    procps \
    default-jdk \
    maven \
    ruby \
    ruby-dev \
    ruby-bundler \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create Maven cache directory
RUN mkdir -p /root/.m2

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

# Pre-build each problem (downloads Maven dependencies)
RUN set -eux; \
    for problem in charges-on-payment-intent invoice-partial-payments subscription-billing-migration; do \
        if [ -d /eval/environment/$problem/server ]; then \
            cd /eval/environment/$problem/server; \
            mvn install -DskipTests || true; \
        fi \
    done

# Prefetch target Stripe SDK (v29.x) for offline use
RUN set -eux; \
    TMP_DIR="$(mktemp -d)"; \
    cd "$TMP_DIR"; \
    echo '<?xml version="1.0" encoding="UTF-8"?><project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><groupId>com.stripe.prefetch</groupId><artifactId>prefetch</artifactId><version>1.0</version><dependencies><dependency><groupId>com.stripe</groupId><artifactId>stripe-java</artifactId><version>29.0.0</version></dependency></dependencies></project>' > pom.xml; \
    mvn dependency:resolve; \
    rm -rf "$TMP_DIR"

# Copy and setup run script
COPY run_inside_docker.sh ./
RUN chmod +x run_inside_docker.sh

CMD ["./run_inside_docker.sh"]
