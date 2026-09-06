import { Linking, Platform } from 'react-native';

/**
 * Loads Razorpay Web SDK dynamically on web / mobile browser.
 */
export async function loadRazorpaySdk() {
  if (Platform.OS !== 'web') return null;

  if (typeof window !== 'undefined' && window.Razorpay) {
    return window.Razorpay;
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById('razorpay-checkout-js');
    if (existingScript) {
      existingScript.onload = () => resolve(window.Razorpay);
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        reject(new Error('Razorpay SDK failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
}

/**
 * Opens Razorpay Standard Checkout modal.
 */
export async function launchRazorpayCheckout({
  keyId,
  orderId,
  amountInPaise,
  currency = 'INR',
  name = 'Vibe Chat',
  description = 'Coins Package',
  prefill = {},
  onSuccess,
  onFailure,
  onDismiss,
  // The hosted Payment Link the server created alongside the order.
  shortUrl,
}) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const RazorpayClass = await loadRazorpaySdk();
    if (!RazorpayClass) {
      throw new Error('Razorpay SDK unavailable');
    }

    const options = {
      key: keyId,
      amount: amountInPaise,
      currency,
      name,
      description,
      order_id: orderId,
      prefill: {
        name: prefill.name || '',
        email: prefill.email || '',
        contact: prefill.phone || '',
      },
      theme: {
        color: '#6366F1',
      },
      handler: function (response) {
        if (onSuccess) {
          onSuccess({
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          });
        }
      },
      modal: {
        ondismiss: function () {
          if (onDismiss) onDismiss();
        },
      },
    };

    const rzp = new RazorpayClass(options);

    rzp.on('payment.failed', function (response) {
      if (onFailure) {
        onFailure({
          code: response.error?.code,
          description: response.error?.description,
          source: response.error?.source,
          step: response.error?.step,
          reason: response.error?.reason,
          orderId: response.error?.metadata?.order_id,
          paymentId: response.error?.metadata?.payment_id,
        });
      }
    });

    rzp.open();
    return true;
  }

  /*
   * Native opens Razorpay's hosted page.
   *
   * The standard checkout is a browser SDK with no native build, so the server
   * also creates a Payment Link when it creates the order and hands back its
   * `shortUrl`. Opening that in the device browser gives the same cards, UPI
   * and netbanking, and the result comes back over the webhook exactly like a
   * web payment.
   *
   * Previously this simply returned `false` and the call site ignored it, so
   * tapping "Pay with Razorpay" on Android did nothing at all — no browser, no
   * error, no explanation.
   */
  if (shortUrl) {
    const canOpen = await Linking.canOpenURL(shortUrl).catch(() => true);
    if (!canOpen) {
      if (onFailure) {
        onFailure({
          description: 'No browser available to open the payment page.',
          reason: 'NO_BROWSER',
        });
      }
      return false;
    }

    await Linking.openURL(shortUrl);
    // Leaving for the browser is not a result. The caller starts polling on
    // return, because the webhook may land before the person comes back.
    return 'pending';
  }

  if (onFailure) {
    onFailure({
      description: 'Could not open Razorpay. Please try Cashfree or UPI.',
      reason: 'RAZORPAY_LINK_UNAVAILABLE',
    });
  }

  return false;
}
