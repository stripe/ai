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

# Pre-install current Ruby dependencies for each problem
RUN set -eux; \
    for problem in charges-on-payment-intent invoice-partial-payments subscription-billing-migration; do \
        if [ -d /eval/environment/$problem/server ]; then \
            cd /eval/environment/$problem/server; \
            bundle config set --local path 'vendor/bundle'; \
            bundle config set --local cache_all true; \
            bundle install || true; \
        fi \
    done

# Prefetch target Stripe SDK (v15.x) gems so upgrades work offline
RUN set -eux; \
    STRIPE_GEM_VERSION="15.5.0"; \
    TMP_DIR="$(mktemp -d)"; \
    cd "$TMP_DIR"; \
    printf "source 'https://rubygems.org'\n\ngem 'stripe', '=%s'\n" "$STRIPE_GEM_VERSION" > Gemfile; \
    bundle config set --local path 'vendor/bundle'; \
    bundle config set --local cache_all true; \
    bundle install; \
    bundle package --all; \
    for problem in charges-on-payment-intent invoice-partial-payments subscription-billing-migration; do \
        mkdir -p /eval/environment/$problem/server/vendor/cache; \
        cp -f vendor/cache/*.gem /eval/environment/$problem/server/vendor/cache/; \
        mkdir -p /eval/solution/$problem/server/vendor/cache; \
        cp -f vendor/cache/*.gem /eval/solution/$problem/server/vendor/cache/; \
    done; \
    rm -rf "$TMP_DIR"

# Copy and setup run script
COPY run_inside_docker.sh ./
RUN chmod +x run_inside_docker.sh

CMD ["./run_inside_docker.sh"]
