"""AG2 (formerly AutoGen) — Customer support with Stripe billing.

Demonstrates AG2's intelligent handoff system routing customer
queries to a billing agent equipped with Stripe tools.

Three handoff types are shown:
  - Context-based: VIP customers fast-track to billing
  - Tool-based: classify_query routes by keyword via ReplyResult
  - After-work: agents terminate after responding
"""

import asyncio
import os
from typing import Annotated

from dotenv import load_dotenv
from autogen import ConversableAgent, LLMConfig
from autogen.agentchat import initiate_group_chat
from autogen.agentchat.group.patterns import DefaultPattern
from autogen.agentchat.group import (
    AgentTarget,
    ContextVariables,
    ExpressionContextCondition,
    ContextExpression,
    OnContextCondition,
    ReplyResult,
    TerminateTarget,
)

from stripe_agent_toolkit.ag2.toolkit import (
    create_stripe_agent_toolkit,
)

load_dotenv()

llm_config = LLMConfig(
    {
        "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        "api_key": os.environ["OPENAI_API_KEY"],
    }
)


async def main():
    toolkit = await create_stripe_agent_toolkit(
        secret_key=os.environ["STRIPE_SECRET_KEY"],
    )

    try:
        # --- Agents ---

        billing_agent = ConversableAgent(
            name="billing_agent",
            system_message=(
                "You are a billing support specialist with "
                "access to Stripe. Help customers with "
                "invoice lookups, charge inquiries, refunds, "
                "and payment links. Use the available Stripe "
                "tools to resolve their request."
            ),
            llm_config=llm_config,
        )

        for tool in toolkit.get_tools():
            tool.register_tool(billing_agent)

        support_agent = ConversableAgent(
            name="support_agent",
            system_message=(
                "You are a general support agent. Handle "
                "technical questions, account issues, and "
                "general inquiries."
            ),
            llm_config=llm_config,
        )

        # --- Tool-based handoff ---

        def classify_query(
            query: Annotated[str, "The customer query to classify"],
            context_variables: ContextVariables,
        ) -> ReplyResult:
            """Classify a customer query and route it."""
            billing_keywords = [
                "invoice",
                "charge",
                "payment",
                "refund",
                "subscription",
                "billing",
                "price",
                "cost",
                "overcharged",
                "receipt",
            ]
            if any(kw in query.lower() for kw in billing_keywords):
                context_variables["issue_type"] = "billing"
                return ReplyResult(
                    message="Billing issue detected. "
                    "Routing to billing support.",
                    target=AgentTarget(billing_agent),
                    context_variables=context_variables,
                )
            context_variables["issue_type"] = "general"
            return ReplyResult(
                message="General inquiry. Routing to support.",
                target=AgentTarget(support_agent),
                context_variables=context_variables,
            )

        triage_agent = ConversableAgent(
            name="triage_agent",
            system_message=(
                "You are a support triage agent. Use "
                "classify_query to route the customer to "
                "the right team. Do not attempt to solve "
                "issues yourself."
            ),
            llm_config=llm_config,
            functions=[classify_query],
        )

        # --- Context-based handoff ---
        # VIP customers bypass triage, go to billing.

        triage_agent.handoffs.add_context_conditions(
            [
                OnContextCondition(
                    target=AgentTarget(billing_agent),
                    condition=ExpressionContextCondition(
                        expression=ContextExpression(
                            "${customer_tier} == 'vip'"
                        ),
                    ),
                )
            ]
        )

        # --- After-work ---

        billing_agent.handoffs.set_after_work(TerminateTarget())
        support_agent.handoffs.set_after_work(TerminateTarget())

        # --- Run ---

        context = ContextVariables(
            data={
                "customer_tier": "standard",
                "issue_type": "",
            }
        )

        user = ConversableAgent(name="user", human_input_mode="NEVER")

        pattern = DefaultPattern(
            initial_agent=triage_agent,
            agents=[
                triage_agent,
                billing_agent,
                support_agent,
            ],
            user_agent=user,
            context_variables=context,
            group_after_work=TerminateTarget(),
        )

        result, final_context, last_agent = initiate_group_chat(
            pattern=pattern,
            messages="I was overcharged on my last "
            "invoice. Can you look up recent charges "
            "and help me with a refund?",
            max_rounds=10,
        )

        print("\n--- Conversation Complete ---")
        print(f"Last agent: {last_agent.name}")
        print(f"Issue type: {final_context.get('issue_type', 'unknown')}")
    finally:
        await toolkit.close()


if __name__ == "__main__":
    asyncio.run(main())
