// Fetch publishable key from server config and initialize checkout
initialize();

async function initialize() {
  // Get publishable key from server
  const config = await fetch("/config").then(r => r.json());
  const stripe = Stripe(config.publishableKey);

  const fetchClientSecret = async () => {
    // Check for challenge param, use to select eval if present
    let body = {};
    const challenge = new URLSearchParams(window.location.search).get('challenge');
    if (challenge) {
      body.challenge = challenge;
    }

    const response = await fetch("/create-checkout-session", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

document.addEventListener('DOMContentLoaded', function() {
  const colors = ['bg-red-700', 'bg-red-800', 'bg-red-900',
                  'bg-blue-700', 'bg-blue-800', 'bg-blue-900',
                  'bg-green-700', 'bg-green-800', 'bg-green-900',
                  'bg-yellow-700', 'bg-yellow-800', 'bg-yellow-900',
                  'bg-purple-700', 'bg-purple-800', 'bg-purple-900',
                  'bg-pink-700', 'bg-pink-800', 'bg-pink-900',
                  'bg-indigo-700', 'bg-indigo-800', 'bg-indigo-900',
                  'bg-gray-700', 'bg-gray-800', 'bg-gray-900'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const navBar = document.querySelector('nav');
  if (navBar) {
    navBar.classList.add(randomColor);
  }
});