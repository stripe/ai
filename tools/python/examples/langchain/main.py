import asyncio
import os
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI

from langgraph.prebuilt import create_react_agent

from stripe_agent_toolkit.langchain.toolkit import create_stripe_agent_toolkit

load_dotenv()


async def main():
    llm = ChatOpenAI(
        model="gpt-4o",
    )

    # Initialize the Stripe toolkit (connects to MCP server)
    stripe_agent_toolkit = await create_stripe_agent_toolkit(
        secret_key=os.getenv("STRIPE_SECRET_KEY"),
    )

    try:
        tools = []
        tools.extend(stripe_agent_toolkit.get_tools())

        langgraph_agent_executor = create_react_agent(llm, tools)

        input_state = {
            "messages": """
                Create a payment link for a new product called 'test' with a price
                of $100. Come up with a funny description about buy bots,
                maybe a haiku.
            """,
        }

        output_state = langgraph_agent_executor.invoke(input_state)

        print(output_state["messages"][-1].content)
    finally:
        # Clean up MCP connection
        await stripe_agent_toolkit.close()


if __name__ == "__main__":
    asyncio.run(main())
