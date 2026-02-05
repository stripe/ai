"""Configuration types for Stripe Agent Toolkit."""

from typing import Optional
from typing_extensions import TypedDict


class Context(TypedDict, total=False):
    """Context for MCP connection."""
    account: Optional[str]
    customer: Optional[str]
    mode: Optional[str]


class Configuration(TypedDict, total=False):
    """Configuration for Stripe Agent Toolkit."""
    context: Optional[Context]
