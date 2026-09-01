import { Platform, Linking } from 'react-native';

/**
 * Loads the official Cashfree Web SDK dynamically on web / mobile browser.
 */
export async function loadCashfreeSdk() {
  if (Platform.OS !== 'web') return null;

  if (typeof window !== 'undefined' && window.Cashfree) {
    return window.Cashfree;
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById('cashfree-sdk-v3');
    if (existingScript) {
      existingScript.onload = () => resolve(window.Cashfree);
      return;
    }

    const script = document.createElement('script');
    script.id = 'cashfree-sdk-v3';
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) {
        resolve(window.Cashfree);
      } else {
        reject(new Error('Cashfree SDK failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.body.appendChild(script);
  });
}

/**
 * Opens Cashfree Checkout seamlessly.
 */
export async function launchCashfreeCheckout({ paymentSessionId, environment = 'sandbox', returnUrl }) {
  const mode = environment === 'production' || environment === 'PROD' ? 'production' : 'sandbox';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const CashfreeInit = await loadCashfreeSdk();
      if (CashfreeInit) {
        const cashfree = CashfreeInit({ mode });
        cashfree.checkout({
          paymentSessionId,
          redirectTarget: '_self', // Opens full sandbox checkout simulator without iframe cross-origin 400 issues
        });
        return true;
      }
    } catch (err) {
      console.warn('Cashfree SDK modal fallback:', err);
    }
  }

  // Fallback for native or when popup blocked
  const fallbackUrl =
    mode === 'production'
      ? `https://payments.cashfree.com/pg/orders/${paymentSessionId}`
      : `https://sandbox.cashfree.com/pg/orders/${paymentSessionId}`;

  return Linking.openURL(fallbackUrl);
}
