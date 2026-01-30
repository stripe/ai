from typing import Any, Optional, Dict
from ..shared.stripe_client import StripeClient


class BillingHooks:
    """Billing hooks for Strands framework to track usage and create meter events."""

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
            meter: Single meter ID for outcome-based billing
            meters: Dictionary of meter IDs for token-based billing (input/output)
        """
        self.type = type
        self.stripe = stripe
        self.customer = customer
        self.meter = meter
        self.meters = meters or {}

    def on_start(self, context: Any = None) -> None:
        """Called when agent execution starts."""
        pass

    def on_end(self, context: Any = None, output: Any = None, usage: Any = None) -> None:
        """
        Called when agent execution ends.

        Args:
            context: Execution context (may contain usage information)
            output: Agent output
            usage: Usage information (tokens, etc.)
        """
        if not self.customer:
            return

        if self.type == "outcome":
            # Create a single meter event for outcome-based billing
            if self.meter:
                self.stripe.create_meter_event(self.meter, self.customer)

        elif self.type == "token":
            # Create meter events for token-based billing
            if usage:
                # Try to extract token usage from different possible formats
                input_tokens = self._extract_input_tokens(usage, context)
                output_tokens = self._extract_output_tokens(usage, context)

                if input_tokens and self.meters.get("input"):
                    self.stripe.create_meter_event(
                        self.meters["input"],
                        self.customer,
                        str(input_tokens)
                    )

                if output_tokens and self.meters.get("output"):
                    self.stripe.create_meter_event(
                        self.meters["output"],
                        self.customer,
                        str(output_tokens)
                    )

    def on_error(
        self,
        context: Any = None,
        error: Optional[Exception] = None
    ) -> None:
        """Called when agent execution encounters an error."""
        pass

    def _extract_input_tokens(self, usage: Any, context: Any = None) -> Optional[int]:
        """Extract input token count from usage information."""
        if hasattr(usage, 'input_tokens'):
            return usage.input_tokens
        elif isinstance(usage, dict):
            return usage.get('input_tokens') or usage.get('prompt_tokens')
        elif context and hasattr(context, 'usage') and hasattr(context.usage, 'input_tokens'):
            return context.usage.input_tokens
        return None

    def _extract_output_tokens(self, usage: Any, context: Any = None) -> Optional[int]:
        """Extract output token count from usage information."""
        if hasattr(usage, 'output_tokens'):
            return usage.output_tokens
        elif isinstance(usage, dict):
            return usage.get('output_tokens') or usage.get('completion_tokens')
        elif context and hasattr(context, 'usage') and hasattr(context.usage, 'output_tokens'):
            return context.usage.output_tokens
        return None
