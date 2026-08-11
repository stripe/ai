"""Optional admission-control mixin for StripeAgentToolkit's `run_tool()`,
powered by tulip-agents (https://tulipagents.ai).

`tulip-agents` is a real dependency of this module and `examples/tulip/`
only -- not the rest of this package, and not added to the core
`pyproject.toml` dependencies for that reason.
"""

from .governance import GovernedToolkitMixin, classify

__all__ = ["GovernedToolkitMixin", "classify"]
