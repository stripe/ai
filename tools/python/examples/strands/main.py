import asyncio
import os
from dotenv import load_dotenv

from strands import Agent
from stripe_agent_toolkit.strands.toolkit import create_stripe_agent_toolkit

load_dotenv()


async def main():
    # Initialize the Stripe toolkit (connects to MCP server)
    stripe_agent_toolkit = await create_stripe_agent_toolkit(
        secret_key=os.getenv("STRIPE_SECRET_KEY"),
        configuration={
            "actions": {
                "payment_links": {
                    "create": True,
                },
                "products": {
                    "create": True,
                },
                "prices": {
                    "create": True,
                },
            }
        },
    )

    try:
        # Get the Stripe tools
        tools = stripe_agent_toolkit.get_tools()

        # Create agent with Stripe tools
        agent = Agent(
            tools=tools
        )

        # Test the agent
        response = agent("""
            Create a payment link for a new product called 'test' with a price
            of $100. Come up with a funny description about buy bots,
            maybe a haiku.
        """)

        print(response)
    finally:
        # Clean up MCP connection
        await stripe_agent_toolkit.close()


if __name__ == "__main__":
    asyncio.run(main())
