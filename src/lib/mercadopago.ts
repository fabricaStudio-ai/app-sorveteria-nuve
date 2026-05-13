export async function createPreference(items: any[]) {
  try {
    const url = '/api/create-preference';
    console.log('Fetching Mercado Pago preference from:', window.location.origin + url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
        success_url: window.location.origin + '/orders?success=true',
        failure_url: window.location.origin + '/cart',
        pending_url: window.location.origin + '/orders?pending=true',
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to create payment preference';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        const text = await response.text();
        console.error('Non-JSON error response:', text);
        errorMessage = `Server error: ${text.substring(0, 100)}...`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating checkout preference:', error);
    throw error;
  }
}
