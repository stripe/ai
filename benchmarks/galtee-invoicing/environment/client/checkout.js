// Fetch publishable key from server config and initialize checkout
initialize();

async function initialize() {
  // Get publishable key from server
  const config = await fetch("/config").then(r => r.json());
  const stripe = Stripe(config.publishableKey);

  const fetchClientSecret = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const product = urlParams.get('product');

    const response = await fetch("/create-checkout-session", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product: product
      })
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