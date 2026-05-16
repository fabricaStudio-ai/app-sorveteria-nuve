export async function createPreference(items: any[], orderId?: string, userEmail?: string, storeId?: string) {
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
        orderId,
        storeId,
        payerEmail: userEmail,
        success_url: window.location.origin + `/orders?success=true${orderId ? `&orderId=${orderId}` : ''}`,
        failure_url: window.location.origin + '/menu',
        pending_url: window.location.origin + `/orders?pending=true${orderId ? `&orderId=${orderId}` : ''}`,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = 'Failed to create payment preference';
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
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
