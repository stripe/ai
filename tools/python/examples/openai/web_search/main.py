import asyncio
import os

from dotenv import load_dotenv
load_dotenv()

from agents import Agent, Runner, WebSearchTool
from stripe_agent_toolkit.openai.toolkit import create_stripe_agent_toolkit


async def main():
    # Initialize the Stripe toolkit (connects to MCP server)
    stripe_agent_toolkit = await create_stripe_agent_toolkit(
        secret_key=os.getenv("STRIPE_SECRET_KEY"),
        configuration={},
    )

    try:
        research_agent = Agent(
            name="Research Agent",
            instructions="You are an expert at research.",
            tools=[WebSearchTool(), *stripe_agent_toolkit.get_tools()],
        )

        result = await Runner.run(
            research_agent,
            "search the web for 'global gdp' and give me the latest data.",
        )
        print(result.final_output)
    finally:
        # Clean up MCP connection
        await stripe_agent_toolkit.close()


if __name__ == "__main__":
    asyncio.run(main())
