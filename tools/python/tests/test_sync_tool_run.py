"""Tests for the synchronous _run path of the LangChain and CrewAI tools."""

import asyncio
import unittest
from concurrent.futures import ThreadPoolExecutor

from stripe_agent_toolkit.shared.schema_utils import (
    json_schema_to_pydantic_model,
)

# The integrations are optional extras; test whichever one imports here.
try:
    from stripe_agent_toolkit.crewai.toolkit import StripeTool as CrewAITool
except ImportError:
    CrewAITool = None
try:
    from stripe_agent_toolkit.langchain.toolkit import StripeTool as LangChainTool
except ImportError:
    LangChainTool = None


async def fake_run_tool(method, args):
    await asyncio.sleep(0)
    return f"{method}:{args['limit']}"


def make_tool(tool_class):
    return tool_class(
        run_tool=fake_run_tool,
        method="list_customers",
        name="list_customers",
        description="List customers",
        args_schema=json_schema_to_pydantic_model(
            {"type": "object", "properties": {"limit": {"type": "integer"}}},
            "list_customers_args",
        ),
    )


class SyncToolRunTests:
    tool_class = None

    def test_run_after_asyncio_run(self):
        # The toolkit is usually created with asyncio.run(), which leaves
        # the main thread without a current event loop afterwards.
        tool = make_tool(self.tool_class)
        asyncio.run(asyncio.sleep(0))
        self.assertEqual(tool._run(limit=1), "list_customers:1")

    def test_run_in_worker_thread(self):
        # LangGraph and CrewAI run sync tools on worker threads, which
        # have no event loop of their own.
        tool = make_tool(self.tool_class)
        with ThreadPoolExecutor() as pool:
            result = pool.submit(tool._run, limit=2).result()
        self.assertEqual(result, "list_customers:2")

    def test_run_inside_running_event_loop(self):
        tool = make_tool(self.tool_class)

        async def main():
            return tool._run(limit=3)

        self.assertEqual(asyncio.run(main()), "list_customers:3")


@unittest.skipIf(LangChainTool is None, "langchain integration not importable")
class TestLangChainSyncToolRun(SyncToolRunTests, unittest.TestCase):
    tool_class = LangChainTool


@unittest.skipIf(CrewAITool is None, "crewai integration not importable")
class TestCrewAISyncToolRun(SyncToolRunTests, unittest.TestCase):
    tool_class = CrewAITool


if __name__ == "__main__":
    unittest.main()
