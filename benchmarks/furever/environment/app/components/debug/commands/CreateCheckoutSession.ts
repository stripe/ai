import {Link} from 'lucide-react';

const createPaymentLink = async () => {
  try {
    const response = await fetch('/api/debug/create_checkout_session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      window.location = data.checkout_session;
    }

    return null;
  } catch (error: any) {
    return error;
  }
};

const config = {
  name: 'Create Checkout Session',
  icon: Link,
  description: 'Create a Checkout Session.',
  action: createPaymentLink,
};

export default config;
