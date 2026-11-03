# Retiring the Agent Toolkit, local MCP proxy, and LLM packages

These packages are no longer maintained and will receive no further updates,
including security fixes. Existing published distributions should remain available
for reproducibility; do not unpublish, delete, or yank them solely for retirement.

| Package | Final version prepared here | Migration | Final source |
| --- | --- | --- | --- |
| `@stripe/agent-toolkit` | `0.9.1` | [Stripe MCP](https://docs.stripe.com/mcp) | [TypeScript](https://github.com/stripe/ai/tree/ai-packages-final/tools/typescript) |
| `stripe-agent-toolkit` | `0.7.1` | [Stripe MCP](https://docs.stripe.com/mcp) | [Python](https://github.com/stripe/ai/tree/ai-packages-final/tools/python) |
| `@stripe/mcp` | `0.3.4` | [Hosted Stripe MCP](https://docs.stripe.com/mcp) | [Local MCP proxy](https://github.com/stripe/ai/tree/ai-packages-final/tools/modelcontextprotocol) |
| `@stripe/ai-sdk` | `0.1.4` | [Token Billing](https://docs.stripe.com/billing/token-billing) | [AI SDK](https://github.com/stripe/ai/tree/ai-packages-final/llm/ai-sdk) |
| `@stripe/token-meter` | `0.1.1` | [Token Billing](https://docs.stripe.com/billing/token-billing) | [Token Meter](https://github.com/stripe/ai/tree/ai-packages-final/llm/token-meter) |

The `ai-packages-final` tag is created manually in step 2. Its links will resolve
after that step. Keep it permanently pointed at the reviewed final release commit.
Plugins, skills, and benchmarks remain maintained separately. The hosted Stripe
MCP server is maintained separately from this retired local proxy. This change
does not shut down `mcp.stripe.com` or `llm.stripe.com`.

## 1. Review and merge the final release preparation PR

Review notices, migration links, metadata, and final versions. Confirm that each
version is still unused in its registry before publishing. The TypeScript toolkit
already declared `0.9.1` before this change, while npm served `0.9.0`; review all
changes since the published release rather than assuming identical package contents.

For native MCP migration, preserve connected-account context and least-privilege
permissions, and verify discovery plus a read-only call in a sandbox. MCP replaces
the toolkit adapters and the local proxy; it does not replace the LLM provider
or metering packages. For local proxy users, replace `npx @stripe/mcp`, Docker,
or desktop-extension configuration with a direct hosted connection. Remove the
old local configuration only after that connection works.

For Token Billing migration, preserve customer attribution and required usage
dimensions. Verify the replacement's usage reporting before switching over. Avoid
running both reporters for the same usage, or removing the old reporter before the
replacement is active, to prevent duplicate or missing billing events.

The final release preparation PR keeps the source and release workflows intact.
Do not merge the stacked deletion PR yet.

## 2. Create and protect the final source tag

After the preparation PR is merged, fetch `main` and identify its actual merged
commit (which may differ from the branch commit after a squash merge). Set
`FINAL_SHA` to that full commit SHA, then:

```bash
git fetch origin main
FINAL_SHA='<reviewed merged preparation commit SHA>'
git tag -a ai-packages-final "$FINAL_SHA" -m 'Final source for retired Agent Toolkit, local MCP proxy, and LLM packages'
git push origin refs/tags/ai-packages-final
```

Protect `ai-packages-final` against updates and deletion with a GitHub tag ruleset.
Verify the five source links above. Optionally create a GitHub release explaining
the retirement. Record the full SHA so closure notices and npm messages can link
directly to `https://github.com/stripe/ai/tree/<SHA>/<package-directory>`.

Do not move the tag after publishing. If review requires changes before publication,
settle those changes before creating the tag.

## 3. Publish and verify the final distributions

Use the existing manual GitHub Actions workflows, selecting `ai-packages-final`
as the ref. Run NPM Release once for each of `./tools/typescript`,
`./tools/modelcontextprotocol`, `./llm/ai-sdk`, and `./llm/token-meter`. Run Python
Release once for `stripe-agent-toolkit`.
These actions publish packages and require the appropriate maintainer access;
they are not performed by merging either PR.

Before publishing `@stripe/ai-sdk`, resolve the existing streaming-test failures:
`should handle errors mid-stream` times out in both
`provider/tests/stripe-language-model.test.ts` and
`provider/tests/stripe-language-model-v3.test.ts` on Node 24. These failures also
reproduce on unchanged `main`; the final documentation release does not fix or
skip them. The release workflow runs the tests and will block publication until
they pass. Complete any necessary fix before creating the final tag in step 2.

The workflows build and test before publishing. The Python release now uses
pytest with pytest-asyncio so its async tests are actually collected, and includes
the build frontend explicitly. Inspect each successful release's files and rendered
README/description, migration links, and source links on npm or PyPI.

Do not replace the packages with empty implementations or introduce intentional
runtime failures. Each npm package's README changes require a new release to
appear on its package page. PyPI description and classifier changes likewise
require a release.

## 4. Deprecate npm and archive PyPI

After all final releases are visible, a package owner should run the following,
substituting the recorded full commit SHA. Keep the package specifications quoted
so the shell does not expand `*`.

```bash
FINAL_SHA='<full SHA of ai-packages-final>'
npm deprecate '@stripe/agent-toolkit@*' "No longer maintained; no further updates, including security fixes. Use Stripe MCP: https://docs.stripe.com/mcp. Final source: https://github.com/stripe/ai/tree/${FINAL_SHA}/tools/typescript" --registry=https://registry.npmjs.org/
npm deprecate '@stripe/mcp@*' "No longer maintained; no further updates, including security fixes. Connect directly to hosted Stripe MCP: https://docs.stripe.com/mcp. Final source: https://github.com/stripe/ai/tree/${FINAL_SHA}/tools/modelcontextprotocol" --registry=https://registry.npmjs.org/
npm deprecate '@stripe/ai-sdk@*' "No longer maintained; no further updates, including security fixes. See Stripe Token Billing: https://docs.stripe.com/billing/token-billing. Final source: https://github.com/stripe/ai/tree/${FINAL_SHA}/llm/ai-sdk" --registry=https://registry.npmjs.org/
npm deprecate '@stripe/token-meter@*' "No longer maintained; no further updates, including security fixes. See Stripe Token Billing: https://docs.stripe.com/billing/token-billing. Final source: https://github.com/stripe/ai/tree/${FINAL_SHA}/llm/token-meter" --registry=https://registry.npmjs.org/
```

Verify the latest version and all version notices:

```bash
npm view '@stripe/agent-toolkit@latest' version deprecated
npm view '@stripe/mcp@latest' version deprecated
npm view '@stripe/ai-sdk@latest' version deprecated
npm view '@stripe/token-meter@latest' version deprecated
npm view '@stripe/agent-toolkit@*' version deprecated --json
npm view '@stripe/mcp@*' version deprecated --json
npm view '@stripe/ai-sdk@*' version deprecated --json
npm view '@stripe/token-meter@*' version deprecated --json
```

In [PyPI project settings](https://pypi.org/manage/project/stripe-agent-toolkit/settings/),
choose **Archive project** after checking the final release. Archival blocks new
uploads and removes the project from search while preserving installations. Verify
the public archived status; do not assume every pip version emits a warning.

References: [npm deprecation](https://docs.npmjs.com/cli/v11/commands/npm-deprecate/),
[npm README updates](https://docs.npmjs.com/about-package-readme-files/), and
[PyPI archival](https://blog.pypi.org/posts/2025-01-30-archival/).

## 5. Merge the deletion PR and retire publishing access

Only proceed after verifying all five registry notices and the final source tag.
The deletion PR removes `tools/typescript/`, `tools/python/`,
`tools/modelcontextprotocol/`, and all of `llm/`. It deletes the npm and Python
release workflows, the package-only CI workflow, and the package Dependabot
configuration. It retains the retirement notices and this checklist.

The PR is initially based on the preparation branch. After the first PR merges,
retarget it to `main`. If the first PR was squash-merged, rebase only the deletion
commit onto `origin/main` and push with `--force-with-lease` so the diff contains
only the removal stage. Review the resulting diff before merging.

Remove obsolete required CI checks from branch protection. Remove the retired
packages' npm trusted publishers, PyPI trusted publishers (including any pending
publishers), and package-specific tokens for all five packages. Preserve any shared
credentials used outside this retirement and retain Stripe's ownership of the
retired names.
Removing workflows from `main` alone does not disable publishing from historical
refs. Run the remaining plugin/helper tests and repository CI.

Review any independently published Docker images and desktop extensions for the
local proxy and add hosted-MCP migration notices or delist their local-proxy
listings as appropriate. The source includes a Dockerfile and desktop-extension
manifest; their external listings are not changed by either PR. Preserve listings
that connect directly to the maintained hosted MCP server.

## 6. Close toolkit, local MCP proxy, and LLM issues and PRs

Recheck state and scope before closing anything. Keep the history and add a closure
comment with the appropriate migration and permanent source links. Do not mark
unresolved bugs as fixed simply because the affected package is retired.

Toolkit PR candidates from the review: #581, #560, #559, #550, #541, #540, #525,
#506, #448, #434, #419, #397, #392, #387, #376, and #351.
Toolkit issue candidates: #580 and #526.

LLM PR candidates: #519, #509, #500, #464, #433, #380, and #340.
LLM issue candidates: #592, #432, and #296. PR #342 now falls entirely within
the combined retirement scope.

Local MCP proxy PR candidates: #542, #480, #445, and #379. Review #584 and
#583 for closure now that the toolkit MCP adapter and local npm proxy are both
retired. Review #455 and #290 for applicability to the local proxy.

Review the permissions report #508 explicitly and record that retirement does not
repair installed copies. Reports affecting the hosted MCP server, including OAuth
and hosted tool behavior, may remain relevant and should be routed to its owners.

Suggested comment, replacing the bracketed links before posting:

> Thanks for the report/contribution. This package has been retired and will receive
> no further updates, including security fixes. See [migration documentation] and
> [final source]. Closing because this work targets the retired package.

Record the final source SHA, registry notices, removal PR, publishing-access cleanup,
and disposition of relevant reports in the internal retirement/security tracking.
Confirm its acceptance criteria before resolving that tracking: historical package
distributions remain downloadable, and existing installations can continue running.
