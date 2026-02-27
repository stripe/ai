# Stripe integration benchmarks

Agentic evals based on Stripe integration tasks. This suite of tasks span categories

1. Backend-only tasks: these tasks involve server-side Stripe integrations and cover data migrations and databases, scripting, and updating backend APIs.
2. Full stack tasks: these tasks involve Stripe integrations requiring both a server-side component and a client-side integration. Browser use is expected as part of a succesful attempt
3. Gym problem sets: these tasks involve a set of simulated exercises covering a specific part of the Stripe feature set such as Checkout or Subscriptions, pushing for depth of understanding covering more niche cases.

# Technical details

The code in this project is intented to be a bring-your-own harness representation of our evaluation tasks; for more on how we ran our evaluations, see the methodology section below.

Each eval is a standalone software project with dependencies and a seaparate README. They will generally follow this structure:

- `environment` - the initialization state for the agent to start the evaluation task. In addition to downloading dependencies, some evals will require initializing databases and creating initial Stripe objects via the Stripe API. Most evaluation runs begin with agents having write and execute acccess in this folder.
- `grader` - graders should not be visible to the agent during the evaluation trial and should be run when the agent completes its work based on the state of the environment.
- `solutions` - some evaluations have reference solutions that should not be shown to the agent but can be used to validate that the Stripe integration benchmarks are properly set up before running an evaluation
- Additional scripts and Dockerfiles - optional additional scripts will be at the root of each project to help run the initial environment and when available, the solution. Dockerfiles are provided as an optional way to containerize the evaluation and demonstrate how the grader should be run relative to the environment.

On using the Stripe API - all evaluations will require use of your own Stripe account in testmode or sandboxes and READMEs will contain instructions on where to place your Secret key and Public key. Evaluations were designed to support multiple runs with the same Stripe account, though there may be some risk of side effects depending on agent behavior.

## Methodology and scoring

For our evaluation, models were run via a goose-based agent harness in a containerized environment with bash, file editing and computer use tools. For documentation of the Stripe API, the ‘search_stripe_documentation’ mcp endpoint was the sole resource available beyond the starting state of each eval.

## Results

The score on an individual task is the best score of 3 runs. Failing runs due to observed infrastructure failures were discarded, and the best scoring run transcript was human reviewed by a Stripe engineer for run integrity.
One exceptional scoring case were the sdk upgrades tasks - charges-on-payment-intent, invoice-partial-payments, and subscription-billing-migration. For these tasks, before aggregating, the task score for each of these were coalesced into a language-upgrades (e.g. ruby-sdk-upgrades) task by averaging. Tasks were then averaged by category: gym, backend, or full-stack.

{TODO: Results coming soon!}
