"""Billing hooks for OpenAI Agents SDK."""

from typing import Any, Optional, Dict
from agents import AgentHooks, RunContextWrapper, Agent

from ..shared.stripe_client import StripeClient


class BillingHooks(AgentHooks):
    """
    Billing hooks for OpenAI Agents SDK to track usage and create meter events.

    Supports two billing modes:
    - "outcome": Creates a single meter event when agent execution ends
    - "token": Creates separate meter events for input and output tokens
    """

    def __init__(
        self,
        stripe: StripeClient,
        type: Optional[str] = None,
        customer: Optional[str] = None,
        meter: Optional[str] = None,
        meters: Optional[Dict[str, str]] = None
    ):
        """
        Initialize billing hooks.

        Args:
            stripe: StripeClient instance for creating meter events
            type: Type of billing - "outcome" or "token"
            customer: Stripe customer ID for billing
            meter: Single meter event name for outcome-based billing
            meters: Dict with 'input' and 'output' meter names for token billing
        """
        self.type = type
        self.stripe = stripe
        self.customer = customer
        self.meter = meter
        self.meters = meters or {}

    async def on_end(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        output: Any
    ) -> None:
        """
        Called when agent execution ends.

        Creates meter events based on the configured billing type.
        """
        if not self.customer:
            return

        if self.type == "outcome":
            if self.meter:
                self.stripe.create_meter_event(self.meter, self.customer)

        elif self.type == "token":
            if self.meters.get("input") and hasattr(context, "usage"):
                input_tokens = getattr(context.usage, "input_tokens", None)
                if input_tokens:
                    self.stripe.create_meter_event(
                        self.meters["input"],
                        self.customer,
                        str(input_tokens)
                    )

            if self.meters.get("output") and hasattr(context, "usage"):
                output_tokens = getattr(context.usage, "output_tokens", None)
                if output_tokens:
                    self.stripe.create_meter_event(
                        self.meters["output"],
                        self.customer,
                        str(output_tokens)
                    )
