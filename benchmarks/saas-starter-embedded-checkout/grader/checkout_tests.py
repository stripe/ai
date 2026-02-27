# EVAL_LEAK_CHECK: saas-starter-embedded-checkout-382f431f-68a1-465d-b7ab-18f11f12c7aa-grader
import os
import stripe
import pytest


@pytest.fixture
def session_data(checkout_session_id):
    """Fixture to retrieve checkout session data once and reuse across tests"""
    return retrieve_checkout_session(checkout_session_id)


def test_checkout_session_ui_mode(session_data):
    """Test that a checkout session has ui_mode set to embedded"""
    # Check that ui_mode is embedded
    print("Checking session UI mode...")
    assert session_data["ui_mode"] == "embedded"


def test_checkout_session_mode(session_data):
    """Test that a checkout session has mode set to subscription"""
    # Check that mode is set to subscription
    print("Checking session mode...")
    assert session_data["mode"] == "subscription"
    # Check that an invoice was created
    assert session_data.get("invoice") is not None


def test_checkout_session_payment_status(session_data):
    """Test that a checkout session has payment status set to paid"""
    # Check that session is paid
    print("Checking session payment status...")
    assert session_data["payment_status"] == "paid"


def test_checkout_session_discounts(session_data):
    """Test that a checkout session has discounts applied"""
    print("Checking session discounts...")
    # Check that a discount was created
    assert len(session_data.get("discounts", [])) > 0
    # Check that a promotion code was used
    discount = session_data["discounts"][0]
    assert discount.get("promotion_code") is not None
    assert discount.get("coupon") is None


def test_checkout_discount_details(session_data):
    """Test that a checkout session has the correct discount details"""
    print("Checking session discount details...")
    # Check that the promotion code matches what we told Claude to create
    discount = session_data["discounts"][0]
    assert discount["promotion_code"]["code"] == "TAKE20"
    # Check that the amount discounted is what we specified
    assert discount["promotion_code"]["coupon"]["percent_off"] == 20.0


### HELPERS
def retrieve_checkout_session(session_id):
    """Helper function to retrieve checkout session data"""
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise ValueError("STRIPE_SECRET_KEY environment variable is required")

    checkout_session = stripe.checkout.Session.retrieve(
        session_id,
        expand=[
            "line_items",
            "discounts",
            "discounts.promotion_code",
            "discounts.promotion_code.coupon",
        ],
    )
    return checkout_session
