"""Tests for Configuration types."""

import unittest
import warnings
from typing import List

from stripe_agent_toolkit.configuration import (
    Configuration,
    Context,
    SUPPORTED_CONFIGURATION_KEYS,
    warn_on_unsupported_configuration,
)
from stripe_agent_toolkit.shared.mcp_client import McpTool
from stripe_agent_toolkit.shared.toolkit_core import ToolkitCore


class TestConfiguration(unittest.TestCase):
    """Tests for Configuration type."""

    def test_empty_configuration(self):
        """Empty configuration should be valid."""
        config: Configuration = {}
        self.assertEqual(config, {})

    def test_configuration_with_context(self):
        """Configuration with context should be valid."""
        config: Configuration = {
            "context": {
                "account": "acct_123",
                "customer": "cus_456",
            }
        }
        self.assertEqual(config["context"]["account"], "acct_123")
        self.assertEqual(config["context"]["customer"], "cus_456")

    def test_context_with_mode(self):
        """Context with mode should be valid."""
        context: Context = {
            "account": "acct_123",
            "mode": "modelcontextprotocol",
        }
        self.assertEqual(context["mode"], "modelcontextprotocol")


def _warnings_for(configuration):
    """Collect warnings raised for a configuration."""
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        warn_on_unsupported_configuration(configuration)
    return caught


class TestUnsupportedConfiguration(unittest.TestCase):
    """Unsupported keys are dropped at runtime, so they must be announced."""

    def test_supported_keys_match_the_typed_dict(self):
        """The allowlist is derived from Configuration, not hand-maintained."""
        self.assertEqual(SUPPORTED_CONFIGURATION_KEYS, frozenset({"context"}))

    def test_empty_configuration_is_silent(self):
        self.assertEqual(_warnings_for({}), [])

    def test_supported_configuration_is_silent(self):
        config = {"context": {"account": "acct_123"}}
        self.assertEqual(_warnings_for(config), [])

    def test_actions_warns_that_it_no_longer_restricts_tools(self):
        """v0.6.x least-privilege configs must not fail open in silence."""
        caught = _warnings_for({"actions": {"payment_links": {"create": True}}})

        self.assertEqual(len(caught), 1)
        self.assertTrue(issubclass(caught[0].category, UserWarning))
        message = str(caught[0].message)
        self.assertIn("configuration.actions", message)
        self.assertIn("ignored", message)
        self.assertIn("Restricted API Key", message)
        self.assertIn("MIGRATION.md", message)

    def test_actions_warning_is_visible_by_default(self):
        """
        A DeprecationWarning here would be hidden outside __main__, which is
        exactly where the toolkit runs. Guard against a downgrade.
        """
        caught = _warnings_for({"actions": {}})
        self.assertNotIsInstance(caught[0].message, DeprecationWarning)
        self.assertIs(caught[0].category, UserWarning)

    def test_unknown_key_warns_and_lists_supported_keys(self):
        caught = _warnings_for({"unexpected": True})

        self.assertEqual(len(caught), 1)
        message = str(caught[0].message)
        self.assertIn("unexpected", message)
        self.assertIn("context", message)

    def test_actions_and_unknown_keys_warn_separately(self):
        caught = _warnings_for({"actions": {}, "unexpected": True})

        self.assertEqual(len(caught), 2)
        messages = " ".join(str(w.message) for w in caught)
        self.assertIn("configuration.actions", messages)
        self.assertIn("unexpected", messages)

    def test_supported_key_alongside_unsupported_is_not_reported(self):
        """`context` is honored, so it must not appear in the ignored list."""
        caught = _warnings_for({"context": {}, "unexpected": True})

        self.assertEqual(len(caught), 1)
        message = str(caught[0].message)
        self.assertIn("key(s): unexpected.", message)


class _StubToolkit(ToolkitCore[List[McpTool]]):
    """Minimal concrete toolkit; the base __init__ is what is under test."""

    def _empty_tools(self) -> List[McpTool]:
        return []

    def _convert_tools(self, mcp_tools: List[McpTool]) -> List[McpTool]:
        return list(mcp_tools)


class TestToolkitCoreConfigurationWarning(unittest.TestCase):
    """The check has to be wired into construction, not just importable."""

    def test_constructing_a_toolkit_with_actions_warns(self):
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            _StubToolkit(
                "rk_test_123",
                {"actions": {"payment_links": {"create": True}}},
            )

        messages = [str(w.message) for w in caught]
        self.assertTrue(
            any("configuration.actions" in m for m in messages),
            f"expected an actions warning, got: {messages}",
        )

    def test_constructing_a_toolkit_without_configuration_is_silent(self):
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            _StubToolkit("rk_test_123")

        self.assertEqual([str(w.message) for w in caught], [])


if __name__ == "__main__":
    unittest.main()
