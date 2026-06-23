/**
 * Razorpay integration — isolated here so swapping sandbox ↔ production
 * or mocking in tests is a one-file change.
 *
 * react-native-razorpay requires a native build (EAS Build / bare workflow).
 * In Expo Go (dev), MOCK_PAYMENT=true simulates a successful checkout.
 * Set MOCK_PAYMENT=false and rebuild natively to use the real SDK.
 */

// Mocked by default (Expo Go can't run the native SDK). Native EAS builds set
// EXPO_PUBLIC_MOCK_PAYMENT=false to exercise the real Razorpay checkout.
const MOCK_PAYMENT = process.env.EXPO_PUBLIC_MOCK_PAYMENT !== 'false';

export interface RazorpayOptions {
  key: string;
  amount: number; // paise
  currency: string;
  orderId: string;
  name: string;
  description: string;
  prefill?: {
    name?: string;
    contact?: string;
  };
}

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export class RazorpayError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function openRazorpayCheckout(
  options: RazorpayOptions
): Promise<RazorpaySuccess> {
  if (MOCK_PAYMENT) {
    // Simulate network + user interaction delay
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return {
      razorpay_payment_id: 'pay_mock_' + Date.now(),
      razorpay_order_id: options.orderId,
      razorpay_signature: 'sig_mock_' + Date.now(),
    };
  }

  // Real Razorpay SDK — only reachable after native build
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RazorpayCheckout = require('react-native-razorpay').default;
  return RazorpayCheckout.open({
    key: options.key,
    amount: options.amount,
    currency: options.currency,
    order_id: options.orderId,
    name: options.name,
    description: options.description,
    prefill: options.prefill ?? {},
    theme: { color: '#2563EB' },
  }) as Promise<RazorpaySuccess>;
}
