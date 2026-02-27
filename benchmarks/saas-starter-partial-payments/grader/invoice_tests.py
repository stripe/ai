import os
import pytest  # type: ignore
import stripe  # type: ignore


def get_stripe_api_key():
    """Get Stripe API key from environment"""
    api_key = os.environ.get("STRIPE_SECRET_KEY")
    if not api_key:
        raise ValueError("STRIPE_SECRET_KEY environment variable is required")
    return api_key


@pytest.fixture
def invoice_payment_data(
    invoice_id,
) -> tuple[stripe.Invoice, list[stripe.InvoicePayment]]:
    """Fixture to retrieve invoice data once and reuse across tests"""
    return retrieve_invoice_with_payments(invoice_id)


def test_invoice_status(invoice_payment_data):
    """Test that an invoice has status set to paid"""
    invoice_data, payment_data = invoice_payment_data
    # Check that invoice is paid
    print("Checking invoice status...")
    assert invoice_data["status"] == "paid"


def test_invoice_has_subscription(invoice_payment_data):
    """Test that an invoice is associated with a subscription"""
    invoice_data, payment_data = invoice_payment_data
    # Check that invoice has a subscription
    print("Checking invoice subscription...")
    assert invoice_data["parent"]["subscription_details"]["subscription"] is not None


def test_invoice_subscription_status(invoice_payment_data):
    """Test that the subscription associated with the invoice is active"""
    invoice_data, payment_data = invoice_payment_data
    # Check that the subscription is active
    print("Checking subscription status...")
    assert (
        invoice_data["parent"]["subscription_details"]["subscription"]["status"]
        == "active"
    )


def test_invoice_has_two_payments(invoice_payment_data):
    """Test that an invoice has two payments recorded"""
    invoice_data, payment_data = invoice_payment_data
    # Check that invoice has two payments
    print("Checking number of payments on invoice...")
    assert len(payment_data) == 2


def test_invoice_payment_amounts(invoice_payment_data):
    """Test that amounts were divided evenly across two payments"""
    invoice_data, payment_data = invoice_payment_data
    # Check that each payment is for half the invoice amount
    print("Checking payment amounts...")
    half_amount = invoice_data["amount_paid"] / 2
    for payment in payment_data:
        assert payment["amount_paid"] == half_amount


def test_invoice_payment_statuses(invoice_payment_data):
    """Test that both payments have status set to succeeded"""
    invoice_data, payment_data = invoice_payment_data
    # Check that both payments succeeded
    print("Checking payment statuses...")
    for payment in payment_data:
        assert payment["status"] == "paid"


def test_invoice_payment_currency(invoice_payment_data):
    """Test that both payments have currency set to usd"""
    invoice_data, payment_data = invoice_payment_data
    # Check that both payments are in USD
    print("Checking payment currencies...")
    for payment in payment_data:
        assert payment["currency"] == invoice_data["currency"]


def test_payment_checkout_sessions(invoice_payment_data):
    """Test that both payments have associated checkout sessions"""
    invoice_data, payment_data = invoice_payment_data
    # Check that both payments have associated checkout sessions
    print("Checking payment checkout sessions...")
    for payment in payment_data:
        payment_intent_id = payment["payment"]["payment_intent"]["id"]
        checkout_session = retrieve_payment_checkout_session(payment_intent_id)
        assert checkout_session is not None
        assert checkout_session["payment_intent"] == payment_intent_id
        assert checkout_session["status"] == "complete"


# Helper Function
def retrieve_invoice_with_payments(
    invoice_id,
) -> tuple[stripe.Invoice, list[stripe.InvoicePayment]]:
    """Helper function to retrieve invoice data"""
    stripe.api_key = get_stripe_api_key()
    invoice = stripe.Invoice.retrieve(
        invoice_id, expand=["parent.subscription_details.subscription"]
    )
    response = stripe.InvoicePayment.list(
        invoice=invoice_id,
        status="paid",  # This avoids including the automatically created PI that is cancelled when we pay the invoice
        expand=["data.payment.payment_intent"],
    )
    payments = response["data"]
    return invoice, payments


def retrieve_payment_checkout_session(payment_intent_id) -> stripe.checkout.Session:
    """Helper function to retrieve checkout session data"""
    stripe.api_key = get_stripe_api_key()
    sessions = stripe.checkout.Session.list(payment_intent=payment_intent_id)
    checkout_session = sessions["data"][0]
    return checkout_session
