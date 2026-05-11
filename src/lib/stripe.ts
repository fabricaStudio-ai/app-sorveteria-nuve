import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const getStripe = () => {
  if (!publishableKey) {
    console.warn("Stripe publishable key is missing. Checkout will not work.");
    return null;
  }
  return loadStripe(publishableKey);
};

export async function createCheckoutSession(items: any[]) {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
        success_url: window.location.origin + '/orders?success=true',
        cancel_url: window.location.origin + '/menu',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}
