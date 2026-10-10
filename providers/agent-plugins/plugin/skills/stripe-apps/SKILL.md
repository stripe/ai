---
name: stripe-apps
description: >-
  Build, modify, or review Stripe Apps and extensions using the relevant
  documentation and reference guides. Use for custom Stripe Dashboard UI,
  stripe-app.yaml, @stripe/ui-extension-sdk, @stripe/extensibility-sdk, script
  extensions, extension interfaces, custom workflow actions, and apps that
  authenticate to Stripe or react to events. Also use when deciding whether a
  Stripe extension can support the user's billing or workflow requirements.

---

## Stripe Apps

Select and read the existing guidance for the user’s task. Product documentation describes what an extension can do; implementation guides describe how to build it. Before recommending an extension or writing code, load the applicable bundled reference files as well as the relevant product documentation. A link or filename in this skill isn’t a substitute for reading its contents.

For a capability question, check native Stripe features and the documented applicability and limitations of the extension. For an implementation request, create or modify working files using the selected guide. For an existing app, inspect its manifest, packages, installed SDK, and local agent instructions before deciding what to change.

## Choose the relevant documentation

Use information already supplied by the user or existing app. Read <references/discovery.md> when you need to clarify the app’s requirements, and <references/extension-types.md> for an overview of app architectures. Ask only for missing information that affects the task.

### Product capabilities

Use these existing product documents to determine which capability fits and whether the account has the required access. Don’t infer support from an extension’s name or the existence of a scaffold.

| Task | Read |
| --- | --- |
| Select an extension interface and its supported implementation types | [Extension points](https://docs.stripe.com/extensions/extension-points.md) and [how extensions work](https://docs.stripe.com/extensions/how-extensions-work.md) |
| Customize prorations | [Native proration behavior](https://docs.stripe.com/billing/subscriptions/prorations.md) and [prorations extensions](https://docs.stripe.com/billing/scripts/prorations.md) |
| Add an action to Stripe Workflows | [Existing workflow actions](https://docs.stripe.com/workflows/define-workflows.md#actions), [existing custom actions](https://docs.stripe.com/workflows/custom-actions.md), and [how custom actions work](https://docs.stripe.com/extensions/custom-actions/how-custom-actions-work.md) |
| Customize another product’s behavior | Follow the selected interface’s product documentation from the extension-point catalog |

### Implementation guidance

The `references/*.md` files are bundled with this skill. After selecting the capability, load the applicable files before following their links to supporting documentation. Combine rows when an app needs multiple types. Follow the selected guide’s prerequisites, scaffolding, testing, and debugging instructions.

| Task | Read |
| --- | --- |
| Build or modify any Dashboard UI, including drawers and full-page apps | <references/ui-extensions.md>, then each selected component’s current API documentation |
| Author, test, or debug a script extension | <references/script-extensions.md>, then the selected extension point’s implementation guide |
| Build a custom-action script | <references/script-extensions.md> and [build a custom action with a script](https://docs.stripe.com/extensions/custom-actions/build-with-script.md) |
| Build a custom-action remote function | [Build a custom action with a remote function](https://docs.stripe.com/extensions/custom-actions/build-with-remote-function.md) |
| Build a self-hosted UI back-end or webhook service | <references/backend.md> and <references/authentication.md>; also load <references/webhooks.md> when receiving Stripe events |
| Store app credentials with the Secret Store API | The Secret Store API section in <references/backend.md> and [store secrets](https://docs.stripe.com/stripe-apps/store-secrets.md), including for apps without a self-hosted back-end |
| Look up APIs, SDK patterns, configuration, or additional extension documentation | <references/canonical-docs.md> |

Use the UI reference for layout and composition, and current component documentation for import paths, props, and styling APIs. For scripts and remote functions, follow the selected extension’s documentation; UI and self-hosted back-end instructions don’t define their runtime capabilities.

### Shared app lifecycle

Read these references when the corresponding task is needed. Reuse existing apps and packages; scaffold only what is missing.

| Task | Read |
| --- | --- |
| Scaffold, build, test, preview, or upload an app | <references/workflow.md>, together with the selected implementation guide |
| Choose authentication for access to Stripe APIs | <references/authentication.md> |
| Receive Stripe events | <references/webhooks.md> |
| Build a first-run setup experience | <references/onboarding-ux.md> and the UI reference |
| Release versions, change installed permissions, or publish to the marketplace | <references/publishing.md> |
| Submit feedback after running app toolchain commands | <references/feedback.md> |

## Load bundled reference files

1. Use the task tables to select every applicable bundled reference under `references/`, then open those files with a file-reading tool before starting the corresponding work. For example, UI with a self-hosted back-end needs both UI and back-end guidance; onboarding also needs the UI reference.
2. Follow relevant pointers to other bundled references inside the files you load, including filenames written as code rather than links. For example, back-end guidance can require authentication guidance, and changing permissions can require publishing guidance. Use this skill’s direct links to locate those files.
3. Read the canonical documentation required by those references. External documentation supplements the bundled guidance on workflow, layout, and other task-specific decisions.

- Resolve `references/` paths relative to this skill’s directory and bare reference filenames relative to its `references/` directory. When reading the hosted skill, fetch the corresponding reference URLs relative to the skill URL.
- Load only references relevant to the task, and reuse contents already read during the session unless they have changed. A full-stack app doesn’t require every document in the skill.
- Read canonical pages using the available documentation tools. Prefer `stripe docs` when available, including for pages that require account access.
- Use current product documentation and the installed SDK’s types for API contracts and limitations. If an example in a reference disagrees, check the version and follow the applicable canonical documentation.
- Read any interface-specific agent instructions supplied with an existing or newly generated extension. If none are present, use the linked product and implementation guides.
- If the documentation doesn’t establish that an extension meets a requirement, state what is unknown or unsupported before proceeding.
- Keep the work within the user’s request. Report the changes, validation results, and remaining steps relevant to that app.
