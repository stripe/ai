import {CreditCard} from 'lucide-react';

const createIssuingCardAuthorization = async () => {
  try {
    await fetch('/api/debug/create_issuing_card_authorization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return null;
  } catch (error: any) {
    return error;
  }
};

const config = {
  name: 'Create Issuing Card Authorization',
  icon: CreditCard,
  description: 'Create an issuing card authorization.',
  action: createIssuingCardAuthorization,
};

export default config;
