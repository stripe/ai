// Product management functionality
class ProductManager {
    constructor() {
        this.products = [];
        this.selectedProducts = new Map();
        this.init();
    }

    async init() {
        this.setupEventListeners();
        // Test server connection before loading products
        await this.testServerConnection();
    }

    async testServerConnection() {
        try {
            // Try a simple ping to see if server is running
            const response = await fetch('/stripe-key');
            if (response.ok) {
                // Server is running, load products
                await this.loadProducts();
            } else {
                throw new Error('Server responded with error');
            }
        } catch (error) {
            console.error('Server connection test failed:', error);
            this.hideLoading();
            this.showError('Cannot connect to server. Please make sure the server is running and try again.');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('/products');
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Products endpoint not found. Please check if the server is running.');
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            
            this.products = await response.json();
            this.renderProducts();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading products:', error);
            this.hideLoading();
            
            // Provide specific error messages based on error type
            let errorMessage = 'Unable to load products. Please try again later.';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Cannot connect to server. Please check if the server is running and try again.';
            } else if (error.message.includes('HTTP error')) {
                errorMessage = `Server responded with error: ${error.message}`;
            } else if (error.message.includes('not found')) {
                errorMessage = error.message;
            } else if (error.message.includes('Server error')) {
                errorMessage = error.message;
            }
            
            this.showError(errorMessage);
        }
    }

    renderProducts() {
        const container = document.getElementById('products-container');
        const form = document.getElementById('product-form');
        
        if (!container || !form) {
            console.error('Required DOM elements not found');
            return;
        }

        container.innerHTML = '';

        this.products.forEach(product => {
            const productCard = this.createProductCard(product);
            container.appendChild(productCard);
        });

        form.style.display = 'block';
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product.id;

        const price = this.formatPrice(product.price, product.currency);
        const imageUrl = product.image_url || '';
        
        card.innerHTML = `
            ${imageUrl ? `
                <div class="product-image">
                    <img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(product.name)}" class="product-img">
                </div>
            ` : ''}
            <div class="product-info">
                <h3 class="product-name">${this.escapeHtml(product.name)}</h3>
                <p class="product-description">${this.escapeHtml(product.description || '')}</p>
                <p class="product-price">${price}</p>
            </div>
            <div class="quantity-controls">
                <label for="quantity-${product.id}">Quantity:</label>
                <div class="quantity-input-group">
                    <button type="button" class="quantity-btn decrease" data-product-id="${product.id}">-</button>
                    <input 
                        type="number" 
                        id="quantity-${product.id}" 
                        name="quantity-${product.id}"
                        min="0" 
                        max="99" 
                        value="0" 
                        class="quantity-input"
                        data-product-id="${product.id}"
                        data-price="${product.price}"
                    >
                    <button type="button" class="quantity-btn increase" data-product-id="${product.id}">+</button>
                </div>
            </div>
        `;

        return card;
    }

    setupEventListeners() {
        // Handle quantity changes
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantity-input')) {
                this.handleQuantityChange(e.target);
            }
        });

        // Handle quantity buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-btn')) {
                this.handleQuantityButton(e.target);
            }
        });

        // Handle form submission
        const form = document.getElementById('product-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCheckout();
            });
        }

        // Add retry button functionality
        const retryButton = document.getElementById('retry-products');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                this.retryLoadProducts();
            });
        }
    }

    async retryLoadProducts() {
        // Hide error message and show loading
        const error = document.getElementById('error-message');
        const loading = document.getElementById('loading-spinner');
        
        if (error) error.style.display = 'none';
        if (loading) loading.style.display = 'block';
        
        // Try to load products again
        await this.loadProducts();
    }

    handleQuantityChange(input) {
        const productId = input.dataset.productId;
        let quantity = parseInt(input.value) || 0;
        const price = parseFloat(input.dataset.price) || 0;

        // Ensure quantity is within bounds
        if (quantity < 0) {
            quantity = 0;
            input.value = 0;
        }
        if (quantity > 99) {
            quantity = 99;
            input.value = 99;
        }

        // Update selected products
        if (quantity > 0) {
            this.selectedProducts.set(productId, {
                id: productId,
                quantity: quantity,
                price: price
            });
        } else {
            this.selectedProducts.delete(productId);
        }

        this.updateTotal();
        this.updateCheckoutButton();
    }

    handleQuantityButton(button) {
        const productId = button.dataset.productId;
        const input = document.getElementById(`quantity-${productId}`);
        
        if (!input) return;

        const currentValue = parseInt(input.value) || 0;
        let newValue = currentValue;
        
        if (button.classList.contains('increase')) {
            newValue = Math.min(currentValue + 1, 99);
        } else if (button.classList.contains('decrease')) {
            newValue = Math.max(currentValue - 1, 0);
        }

        // Update the input value
        input.value = newValue;

        // Manually call handleQuantityChange to ensure totals update
        this.handleQuantityChange(input);
    }

    updateTotal() {
        let total = 0;
        this.selectedProducts.forEach(product => {
            total += (product.price * product.quantity) / 100; // Convert from cents
        });

        const totalElement = document.getElementById('total-amount');
        if (totalElement) {
            totalElement.textContent = total.toFixed(2);
        }
    }

    updateCheckoutButton() {
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = this.selectedProducts.size === 0;
        }
        
        // If payment section is visible, update the order summary
        const paymentSection = document.getElementById('payment-section');
        if (paymentSection && paymentSection.style.display === 'block') {
            const selectedItems = Array.from(this.selectedProducts.values());
            this.populateOrderSummary(selectedItems);
            
            // If no items selected, hide payment section
            if (selectedItems.length === 0) {
                this.hidePaymentSection();
            }
        }
    }

    hidePaymentSection() {
        document.getElementById('payment-section').style.display = 'none';
        
        // Restore checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.textContent = 'Proceed to Checkout';
            checkoutBtn.style.display = 'inline-block';
        }
    }

    handleCheckout() {
        const selectedItems = Array.from(this.selectedProducts.values());
        
        if (selectedItems.length === 0) {
            alert('Please select at least one product before checkout.');
            return;
        }

        console.log('Proceeding to checkout with items:', selectedItems);
        // Show payment section below products and populate order summary
        this.showPaymentSection(selectedItems);
    }

    showPaymentSection(items) {
        // Keep products section visible and show payment section below
        const paymentSection = document.getElementById('payment-section');
        paymentSection.style.display = 'block';
        
        // Scroll to payment section
        paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        initializeCheckoutWithItems(items);
        
        // Update checkout button text to indicate payment section is now visible
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.textContent = 'Update Payment';
            checkoutBtn.style.display = 'none'; // Hide the button since payment is now visible
        }
    }

    populateOrderSummary(items) {
        const orderItemsContainer = document.getElementById('order-items');
        const finalTotalElement = document.getElementById('final-total');
        const subtotalElement = document.getElementById('subtotal');
        
        let total = 0;
        let itemsHTML = '';

        items.forEach(item => {
            const product = this.products.find(p => p.id === item.id);
            if (product) {
                const itemTotal = (item.price * item.quantity) / 100;
                total += itemTotal;
                
                itemsHTML += `
                    <div class="order-item">
                        <span class="item-name">${this.escapeHtml(product.name)} x ${item.quantity}</span>
                        <span class="item-price">$${itemTotal.toFixed(2)}</span>
                    </div>
                `;
            }
        });

        orderItemsContainer.innerHTML = itemsHTML;
        subtotalElement.textContent = total.toFixed(2);
        
        // Update final total considering any applied discounts
        this.updateFinalTotal(total);
        
        // Setup promotion code functionality
        this.setupPromoCodeHandlers();
    }

    updateFinalTotal(subtotal) {
        const finalTotalElement = document.getElementById('final-total');
        const discountLine = document.getElementById('discount-line');
        const discountValue = document.getElementById('discount-value');
        
        let discountAmount = 0;
        if (discountLine.style.display !== 'none') {
            discountAmount = parseFloat(discountValue.textContent) || 0;
        }
        
        const finalTotal = subtotal - discountAmount;
        finalTotalElement.textContent = finalTotal.toFixed(2);
    }

    setupPromoCodeHandlers() {
        const promoInput = document.getElementById('promo-code');
        const applyButton = document.getElementById('apply-promo');
        const promoMessage = document.getElementById('promo-message');
        
        // Remove existing event listeners
        const newApplyButton = applyButton.cloneNode(true);
        applyButton.parentNode.replaceChild(newApplyButton, applyButton);
        
        // Add click handler
        newApplyButton.addEventListener('click', () => this.applyPromoCode());
        
        // Add enter key handler
        promoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyPromoCode();
            }
        });
        
        // Clear message when typing
        promoInput.addEventListener('input', () => {
            promoMessage.textContent = '';
            promoMessage.className = 'promo-message';
        });
    }

    async applyPromoCode() {
        const promoInput = document.getElementById('promo-code');
        const applyButton = document.getElementById('apply-promo');
        const promoMessage = document.getElementById('promo-message');
        const discountLine = document.getElementById('discount-line');
        const discountCode = document.getElementById('discount-code');
        const discountValue = document.getElementById('discount-value');
        const subtotalElement = document.getElementById('subtotal');
        
        const promoCode = promoInput.value.trim();
        
        if (!promoCode) {
            this.showPromoMessage('Please enter a promotion code.', 'error');
            return;
        }
        
        // Disable button and show loading
        applyButton.disabled = true;
        applyButton.textContent = 'Applying...';
        
        try {
            // Get current products
            const selectedItems = Array.from(this.selectedProducts.values());
            
            const response = await fetch('/validate-promo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    promo_code: promoCode,
                    products: selectedItems
                }),
            });
            
            const result = await response.json();
            
            if (result.isValid) {
                // Show success message
                this.showPromoMessage(result.message, 'success');
                
                // Update discount display
                discountCode.textContent = result.discount.code;
                discountValue.textContent = (result.discount.discount_amount / 100).toFixed(2);
                discountLine.style.display = 'block';
                
                // Update totals
                subtotalElement.textContent = (result.totals.subtotal / 100).toFixed(2);
                this.updateFinalTotal(result.totals.subtotal / 100);
                
                // Disable input and change button text
                promoInput.disabled = true;
                applyButton.textContent = 'Applied';
                
            } else {
                this.showPromoMessage(result.message, 'error');
            }
            
        } catch (error) {
            console.error('Error applying promo code:', error);
            this.showPromoMessage('Error applying promotion code. Please try again.', 'error');
        } finally {
            if (!promoInput.disabled) {
                applyButton.disabled = false;
                applyButton.textContent = 'Apply';
            }
        }
    }

    showPromoMessage(message, type) {
        const promoMessage = document.getElementById('promo-message');
        promoMessage.textContent = message;
        promoMessage.className = `promo-message ${type}`;
    }

    clearPromoCode() {
        const promoInput = document.getElementById('promo-code');
        const applyButton = document.getElementById('apply-promo');
        const promoMessage = document.getElementById('promo-message');
        const discountLine = document.getElementById('discount-line');
        
        // Reset form
        promoInput.value = '';
        promoInput.disabled = false;
        applyButton.disabled = false;
        applyButton.textContent = 'Apply';
        promoMessage.textContent = '';
        promoMessage.className = 'promo-message';
        discountLine.style.display = 'none';
        
        // Recalculate totals without discount
        const selectedItems = Array.from(this.selectedProducts.values());
        if (selectedItems.length > 0) {
            this.populateOrderSummary(selectedItems);
        }
    }

    formatPrice(cents, currency = 'USD') {
        const amount = cents / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(amount);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    hideLoading() {
        const loading = document.getElementById('loading-spinner');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showError(message = 'Unable to load products. Please try again later.') {
        const loading = document.getElementById('loading-spinner');
        const error = document.getElementById('error-message');
        
        if (loading) loading.style.display = 'none';
        if (error) {
            // Update the error message if a custom message is provided
            const errorParagraph = error.querySelector('p');
            if (errorParagraph) {
                errorParagraph.textContent = message;
            }
            error.style.display = 'block';
            
            // Make sure retry button is visible and functional
            const retryButton = error.querySelector('#retry-products');
            if (retryButton) {
                retryButton.style.display = 'inline-block';
            }
        }
    }
}

// Payment management functionality
class PaymentManager {
    constructor(productManager) {
        this.productManager = productManager;
        this.stripe = null;
        this.card = null;
        this.clientSecret = null;
        this.init();
    }

    async init() {
        try {
            // Get Stripe public key from server
            const response = await fetch('/stripe-key');
            const { publicKey } = await response.json();
            
            // Initialize Stripe
            this.stripe = Stripe(publicKey);
            
            // Create card element
            this.setupCardElement();
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing Stripe:', error);
            this.showError('Failed to initialize payment system. Please try again.');
        }
    }

    setupCardElement() {
        const elements = this.stripe.elements();
        
        // Create card element with styling
        this.card = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                        color: '#aab7c4',
                    },
                    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                },
                invalid: {
                    color: '#9e2146',
                },
            },
        });

        // Mount card element
        this.card.mount('#card-element');

        // Handle real-time validation errors from the card Element
        this.card.on('change', ({error}) => {
            const displayError = document.getElementById('card-errors');
            if (error) {
                displayError.textContent = error.message;
            } else {
                displayError.textContent = '';
            }
        });
    }

    setupEventListeners() {
        // Handle payment form submission
        const form = document.getElementById('payment-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePayment();
        });
    }

    async handlePayment() {
        const submitButton = document.getElementById('submit-payment');
        const buttonText = document.getElementById('button-text');
        const spinner = document.getElementById('spinner');
        
        // Disable button and show spinner
        submitButton.disabled = true;
        buttonText.style.display = 'none';
        spinner.classList.remove('hidden');

        try {
            // Validate shipping address
            const shippingValidation = this.validateShippingAddress();
            if (!shippingValidation.isValid) {
                throw new Error(shippingValidation.message);
            }
            // First, create a payment method from the card element
            const { error: paymentMethodError, paymentMethod } = await this.stripe.createPaymentMethod({
                type: 'card',
                card: this.card,
                billing_details: {
                    email: document.getElementById('email').value,
                },
            });

            if (paymentMethodError) {
                throw new Error(paymentMethodError.message);
            }

            // Get selected products
            const selectedItems = Array.from(this.productManager.selectedProducts.values());
            
            // Get shipping address
            const shippingAddress = this.getShippingAddress();
            
            // Get applied promotion code if any
            const appliedPromoCode = this.getAppliedPromoCode();
            
            // Send payment method, products, shipping address, and promo code to server
            const response = await fetch('/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    products: selectedItems,
                    payment_method_id: paymentMethod.id,
                    shipping_address: shippingAddress,
                    promo_code: appliedPromoCode,
                }),
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            // Handle different response types from server
            await this.handleServerResponse(result);

        } catch (error) {
            console.error('Payment error:', error);
            this.showError(error.message || 'Payment failed. Please try again.');
        } finally {
            // Re-enable button and hide spinner
            submitButton.disabled = false;
            buttonText.style.display = 'inline';
            spinner.classList.add('hidden');
        }
    }

    async handleServerResponse(result) {
        if (result.requiresAction) {
            // Handle 3D Secure or other authentication requirements
            await this.handleRequiresAction(result);
        } else if (result.clientSecret) {
            // Payment succeeded or completed
            const { error, paymentIntent } = await this.stripe.retrievePaymentIntent(result.clientSecret);
            
            if (error) {
                throw new Error(error.message);
            }
            
            if (paymentIntent.status === 'succeeded') {
                this.showPaymentSuccess(paymentIntent);
            } else {
                throw new Error('Payment was not completed successfully.');
            }
        } else {
            throw new Error('Unexpected response from server.');
        }
    }

    async handleRequiresAction(result) {
        // Handle 3D Secure authentication
        var result = await this.stripe.handleNextAction({clientSecret: result.clientSecret});

        if (result.paymentIntent.status === 'succeeded') {
            this.showPaymentSuccess(result.paymentIntent);
        } else if (result.paymentIntent.status === 'requires_payment_method') {
            throw new Error('Your card was declined. Please try a different payment method.');
        } else {
            // If still requires action, make another request to server
            const response = await fetch('/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymentIntentId: paymentIntent.id,
                }),
            });

            const retryResult = await response.json();
            
            if (retryResult.error) {
                throw new Error(retryResult.error);
            }

            await this.handleServerResponse(retryResult);
        }
    }

    showPaymentSuccess(paymentIntent) {
        const resultContainer = document.getElementById('payment-result');
        resultContainer.innerHTML = `
            <div class="success-message">
                <h3>✅ Payment Successful!</h3>
                <p>Thank you for your purchase. Your payment has been processed successfully.</p>
                <p><strong>Payment ID:</strong> ${paymentIntent.id}</p>
                <button id="new-order" class="cta-button">Start New Order</button>
            </div>
        `;
        resultContainer.style.display = 'block';
        
        // Hide payment form
        document.querySelector('.payment-container').style.display = 'none';
        
        // Setup new order button
        document.getElementById('new-order').addEventListener('click', () => {
            this.resetForNewOrder();
        });
    }

    showError(message) {
        const resultContainer = document.getElementById('payment-result');
        resultContainer.innerHTML = `
            <div class="error-message">
                <h3>❌ Payment Failed</h3>
                <p>${message}</p>
                <button id="retry-payment" class="cta-button">Try Again</button>
            </div>
        `;
        resultContainer.style.display = 'block';
        
        // Setup retry button
        document.getElementById('retry-payment').addEventListener('click', () => {
            resultContainer.style.display = 'none';
        });
    }

    showProductsSection() {
        // Hide payment section but keep products section visible
        document.getElementById('payment-section').style.display = 'none';
        
        // Restore checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.textContent = 'Proceed to Checkout';
            checkoutBtn.style.display = 'inline-block';
        }
        
        // Scroll back to products section
        document.querySelector('.products-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    getShippingAddress() {
        return {
            name: document.getElementById('shipping-name').value,
            line1: document.getElementById('shipping-address').value,
            line2: document.getElementById('shipping-address2').value || null,
            city: document.getElementById('shipping-city').value,
            state: document.getElementById('shipping-state').value,
            postal_code: document.getElementById('shipping-zip').value,
            country: document.getElementById('shipping-country').value,
        };
    }

    getAppliedPromoCode() {
        const discountLine = document.getElementById('discount-line');
        const discountCode = document.getElementById('discount-code');
        
        if (discountLine.style.display !== 'none' && discountCode.textContent) {
            return discountCode.textContent;
        }
        return null;
    }

    validateShippingAddress() {
        const requiredFields = [
            { id: 'shipping-name', label: 'Full Name' },
            { id: 'shipping-address', label: 'Street Address' },
            { id: 'shipping-city', label: 'City' },
            { id: 'shipping-state', label: 'State/Province' },
            { id: 'shipping-zip', label: 'ZIP/Postal Code' },
            { id: 'shipping-country', label: 'Country' }
        ];

        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element.value.trim()) {
                // Scroll to the field and focus it
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
                return {
                    isValid: false,
                    message: `Please fill in your ${field.label.toLowerCase()}.`
                };
            }
        }

        return { isValid: true };
    }

    resetForNewOrder() {
        // Clear selected products
        this.productManager.selectedProducts.clear();
        
        // Reset all quantity inputs
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.value = 0;
        });
        
        // Update totals and button state
        this.productManager.updateTotal();
        this.productManager.updateCheckoutButton();
        
        // Clear promotion code
        this.productManager.clearPromoCode();
        
        // Reset payment form
        document.getElementById('payment-form').reset();
        document.getElementById('card-errors').textContent = '';
        
        // Hide payment section and restore checkout button
        this.showProductsSection();
        
        // Hide result container and show payment form
        document.getElementById('payment-result').style.display = 'none';
        document.querySelector('.payment-container').style.display = 'block';
    }
}

const stripe = Stripe("{YOUR_STRIPE_PUBLISHABLE_KEY}");

// Create a Checkout Session
async function initializeCheckoutWithItems(selectedItems) {
  const fetchClientSecret = async () => {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({
        products: selectedItems,
      }),
    });
    const { clientSecret } = await response.json();
    return clientSecret;
  };

  const checkout = await stripe.initEmbeddedCheckout({
    fetchClientSecret,
  });

  // Mount Checkout
  checkout.mount('#checkout');
}

// Initialize the product manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if required elements exist before initializing
    const requiredElements = [
        'loading-spinner',
        'error-message', 
        'products-container',
        'product-form'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('Missing required DOM elements:', missingElements);
        return;
    }
    
    // Initialize the product manager
    new ProductManager();
});