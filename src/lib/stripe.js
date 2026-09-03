import { Linking, Platform } from 'react-native';

/**
 * Launches Stripe Hosted Checkout Session.
 */
export async function launchStripeCheckout({ paymentUrl }) {
  if (!paymentUrl) {
    throw new Error('Missing Stripe payment URL');
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = paymentUrl;
    return true;
  }

  return Linking.openURL(paymentUrl);
}
