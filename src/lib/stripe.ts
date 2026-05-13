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
    const url = '/api/create-checkout-session';
    console.log('Fetching Stripe session from:', window.location.origin + url);
    const response = await fetch(url, {
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
      let errorMessage = 'Failed to create checkout session';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If not JSON, get text
        const text = await response.text();
        console.error('Non-JSON error response:', text);
        errorMessage = `Server error: ${text.substring(0, 100)}...`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}
