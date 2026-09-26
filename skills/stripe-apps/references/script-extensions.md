# Script extensions

## Build or modify a script extension

Use this reference when a Stripe App change adds or modifies a script implementation. Follow the Stripe Apps workflow reference for app setup, dependencies, versioning, and installation.

## Establish the contract

Before changing code, read the guide for the selected extension point and the installed `@stripe/extensibility-sdk` types. Confirm:

- The extension point supports scripts.
- The request and result types, required methods, and error behavior.
- Constraints that the types don’t express, such as units, ranges, precision, relationships between fields, and supported runtime APIs.
- Whether the change needs configuration, custom schemas, or endpoint access.

Reference the following docs for the required information:

| Topic | Documentation |
| --- | --- |
| Extension points and implementation types | https://docs.stripe.com/extensions/extension-points |
| Script runtime | https://docs.stripe.com/extensions/how-extensions-work#scripts |
| Configuration and schemas | https://docs.stripe.com/extensions/scripts/define-config-and-schemas |
| HTTP calls | https://docs.stripe.com/extensions/invoke-endpoints |

Keep platform requirements separate from the requested business behavior. Don’t change published fixtures, disable checks, or add behavior only to satisfy a fixture.

## Work from the generated extension

For a new extension, discover the extension point and generate its scaffold from the app root:

```bash
stripe generate info extension-point-ids
stripe generate extension <extension-point-id> <extension-id> script --name "<extension-name>" --non-interactive
```

Check the installed CLI help if these options differ. For an existing extension, modify its current scaffold instead of generating it again.

Inspect the generated source, tests, package scripts, and `stripe-app.yaml` declaration before editing. Preserve the entrypoint, SDK interface, required method signatures, and manifest method key. Use the selected extension point’s published schema for manifest fields. The method key might differ from the TypeScript method name.

The manifest identifies the script method but doesn’t necessarily contain a source-file path. Keep the generated extension directory, package metadata, and manifest declaration aligned instead of adding undocumented manifest fields.

### Preserve the generated toolchain

Treat the generated package and configuration as part of the extension contract. Don’t guess package names, import subpaths, peer dependencies, TypeScript libraries, or script names. If generated files are unavailable or incomplete, inspect the installed packages’ `package.json` exports and peer dependencies before reconstructing them. Use compatible published versions for public packages; use a `workspace:` range only when that package is actually provided by the app’s local workspace.

Use only public package exports. For SDK starter kits and acceptance helpers, start with imports in generated tests, then follow `package.json` exports to an executable entrypoint. Don’t import an internal declaration file merely because it contains the desired symbol.

Script lint configuration uses `@stripe/extensibility-eslint-plugin` and an exported configuration for the selected extension point. The package’s root default export and extension-point default export are flat-config arrays: spread them directly rather than looking for `configs.recommended`. Its TypeScript rules also require the parser and plugin supplied by `typescript-eslint`. Apply the JavaScript and TypeScript base configurations before the Stripe Apps base and extension-point configurations, preserving generated ordering and file-specific overrides.

Point type-aware linting at both production and test TypeScript projects, or use the generated project-service setup that covers both. Scope linting to authored source and configuration files and ignore generated output, build output, and dependencies. Don’t weaken runtime rules to make Node-based tests pass.

Keep production and test TypeScript settings separate when their runtime libraries differ. Production typechecking must use the restricted libraries and globals supplied by `@stripe/extensibility-sdk`. Test configuration can add the test runner’s types without making those APIs available to production code. When the production config uses `noLib: true` with SDK restricted declaration files, preserve the generated `skipLibCheck: true`: the restricted declarations can refer to standard types that are intentionally absent, and dependency declaration errors don’t establish an error in authored source.

## Implement the change

Define when the new behavior applies, what happens outside that scope, and how the extension handles invalid input. Every return path must satisfy the extension contract.

- Use explicit SDK request and result types. Don’t hide mismatches with `any` or double casts.
- Preserve SDK scalar types through calculations. Apply documented precision, rounding, signs, units, and time sources instead of converting values to JavaScript primitives.
- Keep module-scope constants runtime-neutral. Store literal values as strings or other permitted primitives and construct SDK scalar instances where they’re used if runtime lint rejects module-scope instances.
- Treat the script runtime and generated lint rules as the authority for available APIs. A test that passes in Node.js doesn’t prove runtime support.
- Use endpoint calls only when the extension point supports them. Follow the endpoint guide for declarations and authentication, and keep secrets out of source and configuration.

If the change adds configuration, define it in the SDK configuration type and use the supported annotations. Regenerate schemas with the generated package script, then inspect the output. Don’t hand-edit generated schemas. Implement runtime defaults explicitly when direct method calls don’t apply schema defaults.

The SDK interface still needs a supported configuration type when the extension has no settings. Preserve the generated empty interface, including its targeted `@typescript-eslint/no-empty-object-type` suppression. Replacing it with a `Record<string, unknown>` type alias can break configuration schema generation. An empty configuration type alone doesn’t require authored custom schemas.

## Test and verify the behavior

Retain the generated acceptance suite and add focused tests for the requested behavior. Cover the condition that activates the change, behavior outside its scope, relevant boundaries, optional configuration, invalid input, and dependency failures. Use typed fixtures with distinct values for fields that have different meanings, and derive expected results independently from the implementation.

Run the extension’s declared build, typecheck, lint, schema, focused-test, acceptance-test, and full-test scripts separately. Use the generated package scripts instead of assuming command names or tool versions. Build and typecheck are distinct verification gates even when their commands overlap; one doesn’t establish that the other ran. Record each exact command, exit status, and test counts, and report unresolved failures without weakening checks.

## Install and activate

After uploading and installing the app, activate the extension at its extension point before testing its installed behavior. Follow the selected extension point’s guide to configure and activate it.
