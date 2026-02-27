## Galtee Invoicing

### Overview
This project includes:
- A problem prompt `environment/PROBLEM.md`
- A Node server skeleton in `environment/server`
- A static client in `environment/client`
- Database files in `environment/db`
- An RSpec grader in `grader`

The `environment` folder is the core of the eval problem that should be provided to the AI being evaluated. The `grader` folder contains hidden grading tests that run against the final submission.

This eval focuses on:
- Integrating with Stripe's Invoice API
- Migrating CSV data into SQLite + Stripe
- Creating Stripe Products and Invoices
- Implementing basic booking management APIs

### Prerequisites
- Node and npm
- Ruby and Bundler (`gem install bundler`)
- SQLite3 CLI (`sqlite3`)

### Setup
1. Install dependencies
   - Server:
     ```
     cd environment/server
     npm install
     ```
   - Ruby (grader + environment tests):
     ```
     bundle install
     ```
     (Run from the `galtee-invoicing/` root where the Gemfile is located)

2. Create environment file at `environment/server/.env`:
```
cp environment/server/.env.example environment/server/.env
# Edit .env and add your Stripe test API keys
```

### Run locally
```
cd environment/server
npm start
```
Open http://localhost:4242

### Validate (environment tests)
```
cd environment/test
./validate.sh
```

### Grade (submission tests)
```
cd grader
./grade.sh
```

### Run Solution Test
```
./run_solution.sh
```
This builds a Docker container and verifies the grader fails without solution, then passes with solution.

Note: For local running of the solution, `node migrate.js` should be run before running the server for grading.

## Leak Detection

UUID `989ed5c1-54cd-4f29-8728-f022c20aaa63` is embedded in grader/solution files to detect leaks:
- Grader: `galtee-invoicing-989ed5c1-54cd-4f29-8728-f022c20aaa63-grader`
- Solution: `galtee-invoicing-989ed5c1-54cd-4f29-8728-f022c20aaa63-solution`
