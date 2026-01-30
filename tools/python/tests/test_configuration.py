import unittest
from stripe_agent_toolkit.configuration import (
    is_tool_allowed,
    is_tool_allowed_by_name,
)


class TestToolAllowed(unittest.TestCase):
    """Tests for is_tool_allowed (legacy action-based filtering)."""

    def test_allowed(self):
        tool = {
            "actions": {
                "customers": {"create": True, "read": True},
                "invoices": {"create": True, "read": True},
            }
        }

        configuration = {
            "actions": {
                "customers": {"create": True, "read": True},
                "invoices": {"create": True, "read": True},
            }
        }

        self.assertTrue(is_tool_allowed(tool, configuration))

    def test_partial_allowed(self):
        tool = {
            "actions": {
                "customers": {"create": True, "read": True},
                "invoices": {"create": True, "read": True},
            }
        }

        configuration = {
            "actions": {
                "customers": {"create": True, "read": True},
                "invoices": {"create": True, "read": False},
            }
        }

        self.assertFalse(is_tool_allowed(tool, configuration))

    def test_not_allowed(self):
        tool = {
            "actions": {
                "payment_links": {"create": True},
            }
        }

        configuration = {
            "actions": {
                "customers": {"create": True, "read": True},
                "invoices": {"create": True, "read": True},
            }
        }

        self.assertFalse(is_tool_allowed(tool, configuration))


class TestToolAllowedByName(unittest.TestCase):
    """Tests for is_tool_allowed_by_name (MCP tool name filtering)."""

    def test_allowed_by_name(self):
        """Tool name is allowed when its permission is enabled."""
        configuration = {
            "actions": {
                "customers": {"create": True},
            }
        }

        self.assertTrue(
            is_tool_allowed_by_name("create_customer", configuration)
        )

    def test_not_allowed_by_name(self):
        """Tool name is not allowed when its permission is disabled."""
        configuration = {
            "actions": {
                "customers": {"create": False},
            }
        }

        self.assertFalse(
            is_tool_allowed_by_name("create_customer", configuration)
        )

    def test_allowed_unknown_tool(self):
        """Unknown tool names are allowed by default."""
        configuration = {
            "actions": {
                "customers": {"create": True},
            }
        }

        self.assertTrue(
            is_tool_allowed_by_name("unknown_tool", configuration)
        )

    def test_allowed_no_actions(self):
        """All tools allowed when no actions configured."""
        configuration = {}

        self.assertTrue(
            is_tool_allowed_by_name("create_customer", configuration)
        )

    def test_not_allowed_missing_resource(self):
        """Tool not allowed when resource is not in configuration."""
        configuration = {
            "actions": {
                "products": {"create": True},
            }
        }

        self.assertFalse(
            is_tool_allowed_by_name("create_customer", configuration)
        )

    def test_list_tool_read_permission(self):
        """List tools require read permission."""
        configuration = {
            "actions": {
                "customers": {"read": True},
            }
        }

        self.assertTrue(
            is_tool_allowed_by_name("list_customers", configuration)
        )

    def test_search_tool_read_permission(self):
        """Search tools require read permission."""
        configuration = {
            "actions": {
                "customers": {"read": True},
            }
        }

        self.assertTrue(
            is_tool_allowed_by_name("search_customers", configuration)
        )


if __name__ == "__main__":
    unittest.main()
