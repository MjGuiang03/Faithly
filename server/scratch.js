import { generatePaymentLink } from './src/utils/paymongo.js';

async function test() {
  try {
    console.log('Testing PayMongo Checkout Session...');
    const result = await generatePaymentLink(250, 'Test Donation', 'D-2026-001');
    console.log('Success!', result.attributes.checkout_url);
  } catch (error) {
    console.error('Test Failed:', error.message);
  }
}

test();
