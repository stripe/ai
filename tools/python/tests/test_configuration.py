"""Tests for Configuration types."""

import unittest
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
