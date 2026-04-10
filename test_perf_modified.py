import time
import os
import sys

# Append the environment dir to path so we can import
sys.path.append(os.path.abspath('environment'))

import init_products
import concurrent.futures

class DummyStripeObj:
    def __init__(self, id):
        self.id = id

class DummyCoupon:
    @staticmethod
    def create(**kwargs):
        time.sleep(0.5) # simulate network latency
        return DummyStripeObj("co_" + kwargs.get("name", "123"))

class DummyPromotionCode:
    @staticmethod
    def create(**kwargs):
        time.sleep(0.5) # simulate network latency
        return DummyStripeObj("promo_123")

class DummyProduct:
    @staticmethod
    def create(**kwargs):
        time.sleep(0.5)
        return DummyStripeObj("prod_" + kwargs.get("name", "123"))

class DummyPrice:
    @staticmethod
    def create(**kwargs):
        time.sleep(0.5)
        return DummyStripeObj("price_123")

import stripe
stripe.Coupon = DummyCoupon
stripe.PromotionCode = DummyPromotionCode
stripe.Product = DummyProduct
stripe.Price = DummyPrice

init_products.STRIPE_SECRET_KEY = "dummy"

products = [
    {"local_id": 1, "name": "Prod 1", "description": "D1", "image_url": "", "local_price_id": 101, "price": 100, "currency": "usd"},
    {"local_id": 2, "name": "Prod 2", "description": "D2", "image_url": "", "local_price_id": 102, "price": 200, "currency": "usd"},
]

discounts = [
    {"code": "D1", "percent_off": 10, "amount_off": None},
    {"code": "D2", "percent_off": 20, "amount_off": None},
    {"code": "D3", "percent_off": None, "amount_off": 500},
]

def process_product(product):
    stripe_product = stripe.Product.create(
        name=product["name"],
        description=product["description"] or "",
        images=[product["image_url"]] if product["image_url"] else [],
    )

    stripe_price = stripe.Price.create(
        product=stripe_product.id,
        unit_amount=product["price"],
        currency=product["currency"],
    )

    return {
        "local_id": product["local_id"],
        "stripe_product_id": stripe_product.id,
        "local_price_id": product["local_price_id"],
        "stripe_price_id": stripe_price.id,
        "name": product["name"],
        "price": product["price"]
    }

def process_discount(discount):
    code = discount["code"]

    # Create coupon
    coupon_params = {
        "name": code,
        "duration": "once",
    }
    if discount["percent_off"]:
        coupon_params["percent_off"] = discount["percent_off"]
        desc = f"{discount['percent_off']}% off"
    else:
        coupon_params["amount_off"] = discount["amount_off"]
        coupon_params["currency"] = "usd"
        desc = f"${discount['amount_off']/100:.2f} off"

    coupon = stripe.Coupon.create(**coupon_params)

    # Create promotion code
    promo = stripe.PromotionCode.create(
        promotion={"type": "coupon", "coupon": coupon.id},
    )

    return {
        "code": code,
        "stripe_coupon_id": coupon.id,
        "stripe_promo_id": promo.id,
        "desc": desc
    }

def migrate_to_stripe_optimized(products, discounts):
    if not init_products.STRIPE_SECRET_KEY:
        print("ERROR: STRIPE_SECRET_KEY environment variable not set")
        return

    stripe.api_key = init_products.STRIPE_SECRET_KEY

    print("=== Adding Stripe ID columns to database ===\n")
    init_products.add_stripe_columns()

    print("\n=== Migrating Products to Stripe ===\n")

    stripe_products = {}
    stripe_prices = {}

    with concurrent.futures.ThreadPoolExecutor() as executor:
        product_results = list(executor.map(process_product, products))

    for res in product_results:
        print(f"Created: {res['name']}")
        print(f"  Stripe ID: {res['stripe_product_id']}")
        stripe_products[res["local_id"]] = res["stripe_product_id"]
        stripe_prices[res["local_price_id"]] = res["stripe_price_id"]
        print(f"  Price: ${res['price']/100:.2f} -> {res['stripe_price_id']}\n")

    # Update database with Stripe IDs
    init_products.update_stripe_ids("inventory", "id", "stripe_product_id", stripe_products)
    init_products.update_stripe_ids("costs", "id", "stripe_price_id", stripe_prices)
    print("Updated database with Stripe product and price IDs\n")

    print("=== Migrating Discounts to Stripe ===\n")

    stripe_coupons = {}
    stripe_promos = {}

    with concurrent.futures.ThreadPoolExecutor() as executor:
        discount_results = list(executor.map(process_discount, discounts))

    for res in discount_results:
        code = res["code"]
        stripe_coupons[code] = res["stripe_coupon_id"]
        stripe_promos[code] = res["stripe_promo_id"]
        print(f"Created coupon: {code} ({res['desc']})")
        print(f"  Coupon ID: {res['stripe_coupon_id']}")
        print(f"  Promo Code ID: {res['stripe_promo_id']}\n")

    # Update database with Stripe IDs
    init_products.update_stripe_ids("discounts", "code", "stripe_coupon_id", stripe_coupons)
    init_products.update_stripe_ids("discounts", "code", "stripe_promo_id", stripe_promos)
    print("Updated database with Stripe coupon and promo IDs\n")

    # Print summary
    print("=== Migration Summary ===\n")
    print("Products:")
    for local_id, stripe_id in stripe_products.items():
        print(f"  {local_id} -> {stripe_id}")

    print("\nPrices:")
    for local_id, stripe_id in stripe_prices.items():
        print(f"  {local_id} -> {stripe_id}")

    print("\nPromotion Codes:")
    for code, promo_id in stripe_promos.items():
        print(f"  {code} -> {promo_id}")

def measure():
    start = time.time()
    migrate_to_stripe_optimized(products, discounts)
    end = time.time()
    print(f"Time taken: {end - start:.2f} seconds")

# mock the db calls inside migrate_to_stripe
def mock_add_stripe_columns():
    pass
def mock_update_stripe_ids(*args):
    pass

init_products.add_stripe_columns = mock_add_stripe_columns
init_products.update_stripe_ids = mock_update_stripe_ids

measure()
