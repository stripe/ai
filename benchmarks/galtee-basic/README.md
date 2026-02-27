## Galtee Basic

### Overview
The `environment` folder is the core of the eval problem; the Grader (`grader`) for this should be hidden from the AI but is run on the final submission for the problem via rspec integration tests that call the implemented server and analyze the final state of the application's db file.

Stripe usage - This eval requires using Stripe API test keys. See [Stripe API keys documentation](https://docs.stripe.com/keys) for details on obtaining and using test keys. If you'd like to have a separate test enviornment for evals, you may create a new Stripe account or use a [sandbox](https://docs.stripe.com/sandboxes).

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
     (Run from the `galtee-basic/` root where the Gemfile is located)

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

## Leak Detection

UUID `bc7bed61-a10c-4ac1-88bf-df795375dfe8` is embedded in grader/solution files to detect leaks:
- Grader: `galtee-basic-bc7bed61-a10c-4ac1-88bf-df795375dfe8-grader`
- Solution: `galtee-basic-bc7bed61-a10c-4ac1-88bf-df795375dfe8-solution`