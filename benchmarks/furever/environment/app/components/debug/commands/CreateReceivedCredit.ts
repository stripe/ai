import {BadgeDollarSign} from 'lucide-react';

const createReceivedCredit = async () => {
  try {
    await fetch('/api/debug/create_received_credit', {
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
  name: 'Create ReceivedCredit',
  icon: BadgeDollarSign,
  description: 'Create a received credit for a Financial Account.',
  action: createReceivedCredit,
};

export default config;
