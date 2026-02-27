#!/bin/bash

set -e  # Exit on error

# Exit codes:
# 0 - Success
# 1 - Test failures or other errors
# 2 - Version check failures

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse command line arguments
LANGUAGE="ruby"  # Default to ruby
PROBLEMID="charges-on-payment-intent"
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -l|--language) LANGUAGE="$2"; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

# Validate language
case $LANGUAGE in
  ruby|dotnet|java) ;;
  *) echo "❌ Unsupported language: $LANGUAGE (supported: ruby, dotnet, java)"; exit 1 ;;
esac

echo "Running charges-on-payment-intent SDK upgrade validation tests for $LANGUAGE..."

ENV_PATH="/workdir/charges-on-payment-intent/environment/server"

if [ ! -d "$ENV_PATH" ]; then
  echo "❌ Environment not found at: $ENV_PATH"
  exit 1
fi

echo "Checking Stripe SDK version..."

# Function to extract major version
get_major_version() {
  echo "$1" | cut -d. -f1
}

# Language-specific version checks
case $LANGUAGE in
  ruby)
    echo "Checking Ruby Gemfile with bundler..."
    cd "$ENV_PATH"
    
    # Use bundler to get the actual stripe version
    STRIPE_VERSION=$(bundle list | grep "stripe " | sed -E 's/.*\(([0-9.]+)\).*/\1/')
    REQUIRED_MAJOR_VERSION="15"
    
    if [ -z "$STRIPE_VERSION" ]; then
      echo "❌ Could not find stripe gem. Make sure bundle install has been run."
      exit 2
    fi
    
    MAJOR_VERSION=$(get_major_version "$STRIPE_VERSION")
    echo "Found stripe gem version: $STRIPE_VERSION"
    
    if [ "$MAJOR_VERSION" = "$REQUIRED_MAJOR_VERSION" ]; then
      echo "✅ Stripe version matches requirement (v$REQUIRED_MAJOR_VERSION)"
    else
      echo "❌ Stripe version $STRIPE_VERSION does not match required version $REQUIRED_MAJOR_VERSION.x"
      echo "  required: stripe gem v$REQUIRED_MAJOR_VERSION"
      exit 2
    fi
    ;;
    
  dotnet)
    echo "Checking .NET packages with dotnet CLI..."
    cd "$ENV_PATH"
    
    # Use dotnet list package to get Stripe.net version
    STRIPE_VERSION=$(dotnet list package | grep "Stripe.net" | awk '{print $NF}')
    REQUIRED_MAJOR_VERSION="48"
    
    if [ -z "$STRIPE_VERSION" ]; then
      echo "❌ Could not find Stripe.net package. Make sure dotnet restore has been run."
      exit 2
    fi
    
    MAJOR_VERSION=$(get_major_version "$STRIPE_VERSION")
    echo "Found Stripe.net version: $STRIPE_VERSION"
    
    if [ "$MAJOR_VERSION" = "$REQUIRED_MAJOR_VERSION" ]; then
      echo "✅ Stripe.net version matches requirement (v$REQUIRED_MAJOR_VERSION)"
    else
      echo "❌ Stripe.net version $STRIPE_VERSION does not match required version $REQUIRED_MAJOR_VERSION.x"
      echo "  required: Stripe.net v$REQUIRED_MAJOR_VERSION"
      exit 2
    fi
    ;;
    
  java)
    echo "Checking Java dependencies with Maven..."
    cd "$ENV_PATH"
    
    # Use Maven to get stripe-java version
    STRIPE_VERSION=$(mvn dependency:list -DincludeArtifactIds=stripe-java 2>/dev/null | grep "stripe-java" | sed -E 's/.*:stripe-java:jar:([0-9.]+).*/\1/')
    REQUIRED_MAJOR_VERSION="29"
    
    if [ -z "$STRIPE_VERSION" ]; then
      echo "❌ Could not find stripe-java dependency. Make sure mvn install has been run."
      exit 2
    fi
    
    MAJOR_VERSION=$(get_major_version "$STRIPE_VERSION")
    echo "Found stripe-java version: $STRIPE_VERSION"
    
    if [ "$MAJOR_VERSION" = "$REQUIRED_MAJOR_VERSION" ]; then
      echo "✅ stripe-java version matches requirement (v$REQUIRED_MAJOR_VERSION)"
    else
      echo "❌ stripe-java version $STRIPE_VERSION does not match required version $REQUIRED_MAJOR_VERSION.x"
      echo "  required: stripe-java v$REQUIRED_MAJOR_VERSION"
      exit 2
    fi
    ;;
esac

echo ""
echo "Running API endpoint tests..."
cd "$SCRIPT_DIR/.."  # Go to parent grader directory
bundle install --quiet

# Output JSON results to a temp file for parsing
echo "problemid: $PROBLEMID"
RESULTS_FILE="/tmp/rspec_results_${PROBLEMID}_${LANGUAGE}.json"
echo "results_file: $RESULTS_FILE"
bundle exec rspec charges-on-payment-intent/grade.rb \
  --format json --out "$RESULTS_FILE" \
  --format documentation
