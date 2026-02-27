# EVAL_LEAK_CHECK: card-element-to-checkout-931a74f4-1523-4179-b5c1-01275efdeb66-grader
import os
import stripe
import pytest
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DISCOUNTS = {
    "SAVE20":{
        "key": "percent_off",
        "value": 20.0,
    },
    "SAVE10":{
        "key": "percent_off",
        "value": 10.0,
    },
    "5OFF":{
        "key": "amount_off",
        "value": 500,
    }
}
PRODUCTS = [
    {
        "name": "Asparagus",
        "price": 899
    },
    {
        "name": "Ethiopean coffee beans",
        "price": 1899
    }
]

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
    """Test that a checkout session has mode set to payment"""
    # Check that mode is set to payment
    print("Checking session mode...")
    assert session_data["mode"] == "payment"
   
def test_line_items(session_data):
    """Test that a checkout session has the correct line items"""
    print("Checking session line items...")
    line_items = session_data["line_items"]["data"]
    assert len(line_items) == len(PRODUCTS)
    
def test_products(session_data):
    """Test that a checkout session has the correct products"""
    print("Checking session products...")
    line_items = session_data["line_items"]["data"]
    for item in line_items:
        product = item["price"]["product"]
        # Check that any product used is one we defined in our DB
        assert any([product.name == p["name"] for p in PRODUCTS])

def test_prices(session_data):
    """Test that a checkout session has the expected prices"""
    line_items = session_data["line_items"]["data"]
    for item in line_items:
        product_name = item.get("price", {}).get("product", {}).get("name", "")
        price_amount = item.get("price", {}).get("unit_amount", 0)
        assert any([price_amount == p["price"] for p in PRODUCTS if p["name"] == product_name])
        assert item.get("price", {}).get("currency", "") == "usd"
        

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
    # Validating our existing promo codes were created from the DB
    assert discount["promotion_code"]["code"] in ["SAVE20", "SAVE10", "5OFF"]
    # Checking which one it is and validating the details
    promo_code = discount["promotion_code"]["code"]
    expected = DISCOUNTS[promo_code]
    coupon = discount.get("promotion_code", {}).get("promotion", {}).get("coupon", {})
    assert coupon[expected["key"]] == expected["value"]


### HELPERS
def retrieve_checkout_session(session_id):
    """Helper function to retrieve checkout session data"""
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise ValueError("STRIPE_SECRET_KEY environment variable is not set")
    stripe.api_version = "2025-09-30.clover"
    checkout_session = stripe.checkout.Session.retrieve(
        session_id,
        expand=[
            "customer",
            "line_items",
            "line_items.data.price.product",
            "discounts",
            "discounts.promotion_code",
            "discounts.promotion_code.promotion.coupon",
            "payment_intent",
        ],
    )
    return checkout_session
