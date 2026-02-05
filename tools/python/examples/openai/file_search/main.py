import asyncio
import os
from pydantic import BaseModel, Field

from dotenv import load_dotenv
load_dotenv()

from agents import Agent, Runner
from agents.tool import FileSearchTool

from stripe_agent_toolkit.openai.toolkit import create_stripe_agent_toolkit


class InvoiceOutput(BaseModel):
    name: str = Field(description="The name of the customer")
    email: str = Field(description="The email of the customer")
    service: str = Field(description="The service that the customer is invoiced for")
    amount_due: int = Field(description="The dollar amount due for the invoice. Convert text to dollar amounts if needed.")
    id: str = Field(description="The id of the stripe invoice")


class InvoiceListOutput(BaseModel):
    invoices: list[InvoiceOutput]


async def main():
    # Initialize the Stripe toolkit (connects to MCP server)
    stripe_agent_toolkit = await create_stripe_agent_toolkit(
        secret_key=os.getenv("STRIPE_SECRET_KEY"),
    )

    try:
        invoice_agent = Agent(
            name="Invoice Agent",
            instructions="You are an expert at using the Stripe API to create, finalize, and send invoices to customers.",
            tools=stripe_agent_toolkit.get_tools(),
        )

        file_search_agent = Agent(
            name="File Search Agent",
            instructions="You are an expert at searching for financial documents.",
            tools=[
                FileSearchTool(
                    max_num_results=50,
                    vector_store_ids=[os.getenv("OPENAI_VECTOR_STORE_ID")],
                )
            ],
            output_type=InvoiceListOutput,
            handoffs=[invoice_agent]
        )

        assignment = "Search for all customers that haven't paid across all of my documents. Handoff to the invoice agent to create, finalize, and send an invoice for each."

        outstanding_invoices = await Runner.run(
            file_search_agent,
            assignment,
        )

        invoices = outstanding_invoices.final_output

        print(invoices)
    finally:
        # Clean up MCP connection
        await stripe_agent_toolkit.close()


if __name__ == "__main__":
    asyncio.run(main())
