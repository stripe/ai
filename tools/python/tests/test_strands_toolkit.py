"""Tests for the Strands integration. No network: fake MCP tool and model."""

import asyncio
import importlib.util
import json
import logging
import unittest

HAS_STRANDS = importlib.util.find_spec("strands") is not None

if HAS_STRANDS:
    from strands import Agent
    from strands.models import Model

    from stripe_agent_toolkit.strands.toolkit import create_strand_tool


def _mcp_tool():
    return {
        "name": "list_customers",
        "description": "List customers",
        "inputSchema": {
            "type": "object",
            "title": "ListCustomers",
            "properties": {
                "limit": {"type": "integer", "title": "Limit", "default": 10}
            },
        },
    }


def _tool_use_events():
    return [
        {"messageStart": {"role": "assistant"}},
        {"contentBlockStart": {"start": {"toolUse": {
            "toolUseId": "tooluse_1", "name": "list_customers"}}}},
        {"contentBlockDelta": {"delta": {"toolUse": {
            "input": json.dumps({"limit": 3})}}}},
        {"contentBlockStop": {}},
        {"messageStop": {"stopReason": "tool_use"}},
    ]


def _text_events():
    return [
        {"messageStart": {"role": "assistant"}},
        {"contentBlockDelta": {"delta": {"text": "done"}}},
        {"contentBlockStop": {}},
        {"messageStop": {"stopReason": "end_turn"}},
    ]


if HAS_STRANDS:
    class _FakeModel(Model):
        """Requests one list_customers call, then ends the turn."""

        def __init__(self):
            self.tool_results = []

        def update_config(self, **model_config):
            pass

        def get_config(self):
            return {}

        async def structured_output(self, *args, **kwargs):
            raise NotImplementedError
            yield

        async def stream(self, messages, tool_specs=None,
                         system_prompt=None, **kwargs):
            results = [
                c["toolResult"] for c in messages[-1]["content"]
                if "toolResult" in c
            ]
            self.tool_results.extend(results)
            for event in _text_events() if results else _tool_use_events():
                yield event


@unittest.skipUnless(HAS_STRANDS, "strands-agents is not installed")
class TestStrandsToolkit(unittest.TestCase):
    def setUp(self):
        self.calls = []

        async def run_tool(method, args):
            self.calls.append((method, args))
            return json.dumps({"object": "list", "data": [{"id": "cus_1"}]})

        self.tool = create_strand_tool(run_tool, _mcp_tool())

    def test_tool_spec(self):
        self.assertEqual(self.tool.tool_name, "list_customers")
        self.assertEqual(self.tool.tool_spec, {
            "name": "list_customers",
            "description": "List customers",
            "inputSchema": {"json": {
                "type": "object",
                "properties": {"limit": {"type": "integer"}},
                "additionalProperties": False,
            }},
        })

    def test_stream_returns_success_tool_result(self):
        async def invoke():
            tool_use = {"toolUseId": "t1", "name": "list_customers",
                        "input": {"limit": 3}}
            events = [e async for e in self.tool.stream(tool_use, {})]
            # Newer strands-agents releases wrap it in a ToolResultEvent
            return getattr(events[-1], "tool_result", events[-1])

        result = asyncio.run(invoke())
        self.assertEqual(result["toolUseId"], "t1")
        self.assertEqual(result["status"], "success")
        self.assertIn("cus_1", result["content"][0]["text"])
        self.assertEqual(self.calls, [("list_customers", {"limit": 3})])

    def test_stream_passes_input_through(self):
        async def invoke(tool_use):
            return [e async for e in self.tool.stream(tool_use, {})]

        asyncio.run(invoke({"toolUseId": "t1", "name": "list_customers"}))
        asyncio.run(invoke({"toolUseId": "t2", "name": "list_customers",
                            "input": []}))
        # Missing input means no arguments; anything else is passed through
        # unchanged so the MCP client rejects malformed input.
        self.assertEqual(self.calls, [
            ("list_customers", {}),
            ("list_customers", []),
        ])

    def test_agent_invokes_tool(self):
        model = _FakeModel()
        agent = Agent(model=model, tools=[self.tool], callback_handler=None)

        async def main():
            # Same shape as examples/strands/main.py
            return agent("List 3 customers")

        self.assertEqual(str(asyncio.run(main())).strip(), "done")
        self.assertEqual(self.calls, [("list_customers", {"limit": 3})])
        self.assertEqual(len(model.tool_results), 1)
        self.assertEqual(model.tool_results[0]["status"], "success")
        self.assertIn("cus_1", model.tool_results[0]["content"][0]["text"])

    def test_agent_reports_tool_error(self):
        async def failing_run_tool(method, args):
            raise RuntimeError("boom")

        tool = create_strand_tool(failing_run_tool, _mcp_tool())
        model = _FakeModel()
        agent = Agent(model=model, tools=[tool], callback_handler=None)

        # Strands logs the tool exception; keep the test output quiet.
        self.addCleanup(logging.disable, logging.root.manager.disable)
        logging.disable(logging.CRITICAL)
        result = agent("List 3 customers")

        self.assertEqual(str(result).strip(), "done")
        self.assertEqual(model.tool_results[0]["status"], "error")
        self.assertIn("boom", model.tool_results[0]["content"][0]["text"])


if __name__ == "__main__":
    unittest.main()
