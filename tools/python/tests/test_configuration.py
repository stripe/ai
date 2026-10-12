"""Tests for Configuration types."""

import unittest
import warnings
from stripe_agent_toolkit.configuration import Configuration, Context


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


if __name__ == "__main__":
    unittest.main()


class TestToolkitCoreConfigurationValidation(unittest.TestCase):
    """Tests for ToolkitCore configuration validation."""

    def setUp(self):
        """Set up test fixtures."""
        from stripe_agent_toolkit.shared.toolkit_core import ToolkitCore
        # Use a minimal concrete implementation for testing
        class MinimalToolkit(ToolkitCore):
            def _empty_tools(self):
                return []
            def _convert_tools(self, mcp_tools):
                return []
        self.MinimalToolkit = MinimalToolkit

    def test_valid_configuration_with_context(self):
        """Valid configuration with context should not warn."""
        config = {"context": {"account": "acct_123"}}
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            toolkit = self.MinimalToolkit('rk_test_123', config)
            # Should not produce any warnings
            self.assertEqual(len(w), 0)

    def test_deprecated_actions_key_warns(self):
        """Configuration with deprecated 'actions' key should warn."""
        config = {"actions": {"payment_links": {"create": True}}}
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            toolkit = self.MinimalToolkit('rk_test_123', config)
            # Should warn about deprecated actions key
            self.assertEqual(len(w), 1)
            self.assertIn("actions", str(w[0].message))
            self.assertIn("v0.6.x", str(w[0].message))
            self.assertEqual(w[0].category, DeprecationWarning)

    def test_unknown_key_warns(self):
        """Configuration with unknown key should warn."""
        config = {"unknown_setting": "value"}
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            toolkit = self.MinimalToolkit('rk_test_123', config)
            # Should warn about unknown key
            self.assertEqual(len(w), 1)
            self.assertIn("unknown_setting", str(w[0].message))
            self.assertEqual(w[0].category, UserWarning)

    def test_multiple_unknown_keys_all_warn(self):
        """Configuration with multiple unknown keys should warn for each."""
        config = {"actions": {"foo": True}, "unknown": "value"}
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            toolkit = self.MinimalToolkit('rk_test_123', config)
            # Should warn about both: one DeprecationWarning for actions, one UserWarning for unknown
            self.assertEqual(len(w), 2)
            messages = [str(warning.message) for warning in w]
            self.assertTrue(any("actions" in msg for msg in messages))
            self.assertTrue(any("unknown" in msg for msg in messages))

    def test_empty_configuration_is_valid(self):
        """Empty configuration should be valid and not warn."""
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            toolkit = self.MinimalToolkit('rk_test_123', {})
            # Should not produce any warnings
            self.assertEqual(len(w), 0)

    def test_none_configuration_is_valid(self):
        """None configuration should be valid and not warn."""
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            toolkit = self.MinimalToolkit('rk_test_123', None)
            # Should not produce any warnings
            self.assertEqual(len(w), 0)

