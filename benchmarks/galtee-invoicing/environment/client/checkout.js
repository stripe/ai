const PRODUCT_CONFIG = {
  fr_hike: { name: "French Alps hike", amount: 32500, currency: "eur" },
  gb_hike: { name: "Great Britain hike", amount: 20000, currency: "gbp" },
  painters_way: { name: "Painter's Way", amount: 120000, currency: "eur" },
};

async function initialize() {
  const urlParams = new URLSearchParams(window.location.search);
  const product = urlParams.get('product');
  const productInfo = PRODUCT_CONFIG[product];

  if (!productInfo) {
    renderFallback("Invalid product selected.");
    return;
  }

  renderCheckoutForm(product, productInfo);
}

function renderCheckoutForm(product, productInfo) {
  const checkoutRoot = document.getElementById('checkout');
  const amountLabel = `${productInfo.currency.toUpperCase()} ${(productInfo.amount / 100).toFixed(2)}`;

  checkoutRoot.innerHTML = `
    <div class="checkout-form">
      <h2>Book ${productInfo.name}</h2>
      <p>Amount: <strong>${amountLabel}</strong></p>
      <label>
        Email
        <input id="checkout-email" type="email" value="hiker+test@stripe.com" placeholder="you@example.com" />
      </label>
      <label>
        Payment token
        <input id="checkout-payment-method" type="text" value="tok_visa" placeholder="tok_visa or tok_visa_chargeDeclined" />
      </label>
      <button id="checkout-submit">Complete booking</button>
      <div id="checkout-message" role="alert"></div>
    </div>
  `;

  document.getElementById('checkout-submit').addEventListener('click', async () => {
    await submitPurchase(product, productInfo);
  });
}

async function submitPurchase(product, productInfo) {
  const button = document.getElementById('checkout-submit');
  const messageEl = document.getElementById('checkout-message');
  const email = document.getElementById('checkout-email').value.trim();
  const paymentMethod = document.getElementById('checkout-payment-method').value.trim();

  messageEl.innerText = '';
  button.disabled = true;
  button.innerText = 'Processing...';

  try {
    const response = await fetch('/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product,
        email,
        amount: productInfo.amount,
        currency: productInfo.currency,
        payment_method: paymentMethod,
      }),
    });

    const payload = await response.json().catch(() => ({ error: 'Invalid JSON response from server' }));

    if (!response.ok || !payload.success) {
      const message = payload.error || 'Purchase could not be completed';
      renderFallback(message, payload.fallback || {});
      return;
    }

    renderPurchaseSuccess(payload);
  } catch (error) {
    renderFallback(error.message || 'Network error during purchase request');
  } finally {
    if (button) {
      button.disabled = false;
      button.innerText = 'Complete booking';
    }
  }
}

function renderPurchaseSuccess(payload) {
  const checkoutRoot = document.getElementById('checkout');
  const invoiceLinks = [];

  if (payload.invoice_url) {
    invoiceLinks.push(`<a href="${payload.invoice_url}" target="_blank">View invoice</a>`);
  }
  if (payload.invoice_pdf) {
    invoiceLinks.push(`<a href="${payload.invoice_pdf}" target="_blank">Download invoice PDF</a>`);
  }

  checkoutRoot.innerHTML = `
    <div class="purchase-success">
      <h2>Booking complete</h2>
      <p>Your invoice was created successfully.</p>
      <p><strong>Invoice ID:</strong> ${payload.invoice_id || 'N/A'}</p>
      <p>${invoiceLinks.join(' | ')}</p>
    </div>
  `;
}

function renderFallback(message, fallback = null) {
  const checkoutRoot = document.getElementById('checkout');
  const bankDetails = fallback && Object.keys(fallback).length ? fallback : {
    account_holder: 'Galtee Adventures',
    iban: 'GB29NWBK60161331926819',
    bic: 'NWBKGB2L',
    reference: 'Use your invoice reference',
    amount: 'Please confirm the amount with support',
    qr_code_url: 'https://api.qrserver.com/v1/create-qr-code?size=240x240&data=GB29NWBK60161331926819',
  };

  checkoutRoot.innerHTML = `
    <div class="invoice-fallback">
      <h2>Checkout could not be completed</h2>
      <p>${message}</p>
      <div class="fallback-details">
        <p>Please complete payment using bank transfer or request a manual invoice.</p>
        <p><strong>Account holder:</strong> ${bankDetails.account_holder}</p>
        <p><strong>IBAN:</strong> ${bankDetails.iban}</p>
        <p><strong>BIC:</strong> ${bankDetails.bic}</p>
        <p><strong>Reference:</strong> ${bankDetails.reference}</p>
        <p><strong>Amount:</strong> ${bankDetails.amount}</p>
      </div>
      <div class="qr-code">
        <img src="${bankDetails.qr_code_url}" alt="Bank transfer QR code" />
      </div>
    </div>
  `;
}

initialize();
