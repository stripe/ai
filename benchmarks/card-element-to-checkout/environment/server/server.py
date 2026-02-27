"""
This flask server powers a Stripe integration with the Card element.
"""

import stripe
import json
import os
import sqlite3

from flask import Flask, render_template, jsonify, request, send_from_directory
from dotenv import load_dotenv

# Loading environment variables
load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
stripe.api_version = '2018-11-08'
DB_NAME = os.getenv("DB_NAME")


static_dir = str(os.path.abspath(os.path.join(__file__ , "../..", os.getenv("STATIC_DIR", "static"))))


# ========================= PAYMENT INTENT STATUS HANDLING =========================

def generate_response(intent):
    status = intent['status']
    if status == 'requires_action' or status == 'requires_source_action':
        # Card requires authentication
        return jsonify({'requiresAction': True, 'paymentIntentId': intent['id'], 'clientSecret': intent['client_secret']})
    elif status == 'requires_payment_method' or status == 'requires_source':
        # Card was not properly authenticated, suggest a new payment method
        return jsonify({'error': 'Your card was denied, please provide a new payment method'})
    elif status == 'succeeded':
        # Payment is complete, authentication not required
        # To cancel the payment you will need to issue a Refund (https://stripe.com/docs/api/refunds)
        print("💰 Payment received!")
        return jsonify({'clientSecret': intent['client_secret']})

def calculate_order_amount(products):
    # Replace this constant with a calculation of the order's amount
    # Calculate the order total on the server to prevent
    # people from directly manipulating the amount on the client
    return sum(item['price'] * item.get('quantity', 0) for item in products)

def calculate_discount_amount(subtotal, discount):
    """Calculate discount amount based on discount type"""
    if discount.get('percent_off'):
        return int(subtotal * (discount['percent_off'] / 100))
    elif discount.get('amount_off'):
        return min(discount['amount_off'], subtotal)  # Don't exceed subtotal
    return 0

def validate_promotion_code(promotion_code):
    if not DB_NAME:
        raise ValueError("DB_NAME environment variable is not set")
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("SELECT code, amount_off, percent_off FROM discounts WHERE code = ?", (promotion_code,))
        result = cursor.fetchone()
        conn.close()
        if result:
            code, amount_off, percent_off = result
            return {
                "isValid": True, 
                "discount": {
                    "code": code,
                    "amount_off": amount_off,
                    "percent_off": percent_off
                }
            }
        else:
            return {"isValid": False, "message": "Invalid promotion code."}
    except Exception as e:
        print(f"Error validating promotion code: {e}")
        return {"isValid": False, "message": "Error validating promotion code."}

# ========================= CREATE AND RETURN APPLICATION INSTANCE =========================

def create_app():
    """Application factory pattern for creating Flask app"""
    print(f"Using static directory: {static_dir}")
    app = Flask(__name__, static_folder=static_dir,
                static_url_path="", template_folder=static_dir)
    
    # Configure the app
    app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Register routes
    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/stripe-key", methods=["GET"])
    def get_stripe_key():
        return jsonify({"publicKey": os.getenv("STRIPE_PUBLISHABLE_KEY")})

    @app.route("/products", methods=["GET"])
    def get_products():
        if not DB_NAME:
            raise ValueError("DB_NAME environment variable is not set")
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("""
        SELECT
        po.id, po.name, po.description, po.image_url,
        pr.unit_amount, pr.currency
        FROM inventory AS po
        INNER JOIN costs AS pr
        ON po.id = pr.product""")
        products = [{"id": row[0], "name": row[1], "description": row[2], "image_url": row[3], "price": row[4], "currency": row[5]} for row in cursor.fetchall()]
        conn.close()
        return jsonify(products)

    @app.route("/validate-promo", methods=["POST"])
    def validate_promo():
        data = json.loads(request.data)
        promo_code = data.get('promo_code', '').strip().upper()
        products = data.get('products', [])
        
        if not promo_code:
            return jsonify({"isValid": False, "message": "Please enter a promotion code."})
        
        # Validate the promotion code
        validation_result = validate_promotion_code(promo_code)
        
        if not validation_result['isValid']:
            return jsonify(validation_result)
        
        # Calculate subtotal
        subtotal = calculate_order_amount(products)
        
        # Calculate discount amount
        discount_info = validation_result['discount']
        discount_amount = calculate_discount_amount(subtotal, discount_info)
        final_total = subtotal - discount_amount
        
        return jsonify({
            "isValid": True,
            "discount": {
                "code": discount_info['code'],
                "amount_off": discount_info.get('amount_off'),
                "percent_off": discount_info.get('percent_off'),
                "discount_amount": discount_amount
            },
            "totals": {
                "subtotal": subtotal,
                "discount_amount": discount_amount,
                "final_total": final_total
            },
            "message": f"Promotion code '{promo_code}' applied successfully!"
        })


    @app.route("/pay", methods=["POST"]) #type: ignore
    def pay():
        data = json.loads(request.data)
        print(f"Payment request received: {data}")

        try:
            if "paymentIntentId" not in data:
                # Calculate base amount
                subtotal = calculate_order_amount(data['products'])
                amount = subtotal
                
                # Apply discount if promo code is provided
                promo_code = data.get('promo_code')
                if promo_code:
                    validation_result = validate_promotion_code(promo_code)
                    if validation_result['isValid']:
                        discount_amount = calculate_discount_amount(subtotal, validation_result['discount'])
                        amount = subtotal - discount_amount
                        print(f"Applied discount: {discount_amount} cents, final amount: {amount} cents")
                
                print(f"Calculated order amount: {amount}")
                
                # Create a PaymentIntent with the order amount and currency
                intent = stripe.PaymentIntent.create(
                    amount=amount,
                    currency='usd',
                    payment_method_types=["card"],
                    payment_method=data.get('payment_method_id'),
                    confirm=True,
                    return_url="https://example.com/return",
                    metadata={
                        "shipping_address": json.dumps(data.get("shipping_address", {})),
                        "promo_code": data.get("promo_code", ""),
                    })
                print(f"PaymentIntent created: {intent['id']}")
            else:
                # Retrieve existing PaymentIntent
                intent = stripe.PaymentIntent.retrieve(data['paymentIntentId'])
            
            return generate_response(intent)
        except Exception as e:
            print(f"Error: {e}")
            return jsonify({'error': str(e)})

    return app




# Create the app instance for export
app = create_app()
