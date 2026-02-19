"""Stripe Agent Toolkit - MCP-based toolkit for AI agent frameworks."""

from .configuration import Configuration, Context
from .shared.constants import VERSION

__all__ = ["Configuration", "Context", "VERSION"]
__version__ = VERSION
