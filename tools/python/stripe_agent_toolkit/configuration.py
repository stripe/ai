"""Configuration types for Stripe Agent Toolkit."""

import warnings
from typing import Any, Mapping, Optional
from typing_extensions import TypedDict


class Context(TypedDict, total=False):
    """Context for MCP connection."""
    account: Optional[str]
    customer: Optional[str]
    mode: Optional[str]


class Configuration(TypedDict, total=False):
    """Configuration for Stripe Agent Toolkit."""
    context: Optional[Context]


SUPPORTED_CONFIGURATION_KEYS = frozenset(Configuration.__annotations__)

MIGRATION_GUIDE_URL = (
    "https://github.com/stripe/ai/blob/main/tools/python/MIGRATION.md"
)


def warn_on_unsupported_configuration(
    configuration: Mapping[str, Any]
) -> None:
    """
    Warn about configuration keys this version does not read.

    `Configuration` is a `total=False` TypedDict, so at runtime unknown keys
    are accepted and silently dropped. That is worth a warning in general, and
    specifically for `actions`: in v0.6.x it bounded which tools were exposed
    to the agent, so carrying it into v0.7.x is not a narrower policy but no
    policy at all. Warn rather than raise, so that an upgrade surfaces the
    change without breaking callers at import time.

    `UserWarning` is deliberate. `DeprecationWarning` is hidden by default
    outside `__main__`, which would leave the case this exists to catch
    invisible in exactly the library code where it matters.
    """
    unsupported = set(configuration) - SUPPORTED_CONFIGURATION_KEYS
    if not unsupported:
        return

    if "actions" in unsupported:
        warnings.warn(
            "[StripeAgentToolkit] `configuration.actions` was removed in "
            "v0.7.0 and is ignored. It no longer limits which tools are "
            "exposed to the agent. Tool permissions are now controlled "
            "entirely by your Restricted API Key (RAK) on the server side. "
            f"See {MIGRATION_GUIDE_URL}",
            UserWarning,
        )

    other = sorted(unsupported - {"actions"})
    if other:
        warnings.warn(
            "[StripeAgentToolkit] Ignoring unsupported configuration key(s): "
            f"{', '.join(other)}. Supported keys: "
            f"{', '.join(sorted(SUPPORTED_CONFIGURATION_KEYS))}.",
            UserWarning,
        )
