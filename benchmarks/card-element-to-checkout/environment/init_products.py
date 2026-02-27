#!/usr/bin/env python3
"""
Migrate products and discounts from local SQLite to Stripe.

Reads from the existing database tables and creates corresponding
Stripe products, prices, coupons, and promotion codes.

Usage:
    STRIPE_SECRET_KEY=sk_test_xxx python init_products.py
"""

import os
import sqlite3
import stripe

# Configuration
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
DB_PATH = "environment/server/db.sqlite3"

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


def load_products_from_db():
    """Load products and prices from the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            i.id, i.name, i.description, i.image_url,
            c.id as price_id, c.unit_amount, c.currency
        FROM inventory i
        JOIN costs c ON c.product = i.id
    """)

    products = []
    for row in cursor.fetchall():
        products.append({
            "local_id": row[0],
            "name": row[1],
            "description": row[2],
            "image_url": row[3],
            "local_price_id": row[4],
            "price": row[5],
            "currency": row[6],
        })

    conn.close()
    return products


def load_discounts_from_db():
    """Load discounts from the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT code, amount_off, percent_off FROM discounts")

    discounts = []
    for row in cursor.fetchall():
        discounts.append({
            "code": row[0],
            "amount_off": row[1],
            "percent_off": row[2],
        })

    conn.close()
    return discounts


def add_stripe_columns():
    """Add Stripe ID columns to existing tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Add stripe_product_id to inventory
    try:
        cursor.execute("ALTER TABLE inventory ADD COLUMN stripe_product_id TEXT")
        print("  Added stripe_product_id column to inventory")
    except sqlite3.OperationalError:
        print("  stripe_product_id column already exists in inventory")

    # Add stripe_price_id to costs
    try:
        cursor.execute("ALTER TABLE costs ADD COLUMN stripe_price_id TEXT")
        print("  Added stripe_price_id column to costs")
    except sqlite3.OperationalError:
        print("  stripe_price_id column already exists in costs")

    # Add stripe columns to discounts
    try:
        cursor.execute("ALTER TABLE discounts ADD COLUMN stripe_coupon_id TEXT")
        print("  Added stripe_coupon_id column to discounts")
    except sqlite3.OperationalError:
        print("  stripe_coupon_id column already exists in discounts")

    try:
        cursor.execute("ALTER TABLE discounts ADD COLUMN stripe_promo_id TEXT")
        print("  Added stripe_promo_id column to discounts")
    except sqlite3.OperationalError:
        print("  stripe_promo_id column already exists in discounts")

    conn.commit()
    conn.close()


def update_stripe_ids(table, id_column, stripe_column, mapping):
    """Update Stripe IDs in the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for local_id, stripe_id in mapping.items():
        cursor.execute(
            f"UPDATE {table} SET {stripe_column} = ? WHERE {id_column} = ?",
            (stripe_id, local_id)
        )

    conn.commit()
    conn.close()


def migrate_to_stripe(products, discounts):
    """Create Stripe products, prices, coupons, and promotion codes."""
    if not STRIPE_SECRET_KEY:
        print("ERROR: STRIPE_SECRET_KEY environment variable not set")
        return

    stripe.api_key = STRIPE_SECRET_KEY

    print("=== Adding Stripe ID columns to database ===\n")
    add_stripe_columns()

    print("\n=== Migrating Products to Stripe ===\n")

    stripe_products = {}
    stripe_prices = {}

    for product in products:
        # Check if product already exists by name
        stripe_product = stripe.Product.create(
            name=product["name"],
            description=product["description"] or "",
            images=[product["image_url"]] if product["image_url"] else [],
        )
        print(f"Created: {product['name']}")
        print(f"  Stripe ID: {stripe_product.id}")

        stripe_products[product["local_id"]] = stripe_product.id

        # Create a new price
        stripe_price = stripe.Price.create(
            product=stripe_product.id,
            unit_amount=product["price"],
            currency=product["currency"],
        )
        stripe_prices[product["local_price_id"]] = stripe_price.id
        print(f"  Price: ${product['price']/100:.2f} -> {stripe_price.id}")
        print()

    # Update database with Stripe IDs
    update_stripe_ids("inventory", "id", "stripe_product_id", stripe_products)
    update_stripe_ids("costs", "id", "stripe_price_id", stripe_prices)
    print("Updated database with Stripe product and price IDs\n")

    print("=== Migrating Discounts to Stripe ===\n")

    stripe_coupons = {}
    stripe_promos = {}

    for discount in discounts:
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
        stripe_coupons[code] = coupon.id
        print(f"Created coupon: {code} ({desc})")
        print(f"  Coupon ID: {coupon.id}")

        # Create promotion code
        promo = stripe.PromotionCode.create(
            promotion={"type": "coupon", "coupon": coupon.id},
        )
        stripe_promos[code] = promo.id
        print(f"  Promo Code ID: {promo.id}")
        print()

    # Update database with Stripe IDs
    update_stripe_ids("discounts", "code", "stripe_coupon_id", stripe_coupons)
    update_stripe_ids("discounts", "code", "stripe_promo_id", stripe_promos)
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


def main():
    print("Card Element to Checkout - DB to Stripe Migration\n")
    print(f"Reading from: {DB_PATH}\n")

    # Load from database
    products = load_products_from_db()
    discounts = load_discounts_from_db()

    print(f"Found {len(products)} products:")
    for p in products:
        print(f"  - {p['name']} @ ${p['price']/100:.2f}")

    print(f"\nFound {len(discounts)} discounts:")
    for d in discounts:
        if d["percent_off"]:
            print(f"  - {d['code']}: {d['percent_off']}% off")
        else:
            print(f"  - {d['code']}: ${d['amount_off']/100:.2f} off")

    print()

    # Migrate to Stripe
    migrate_to_stripe(products, discounts)


if __name__ == "__main__":
    main()
