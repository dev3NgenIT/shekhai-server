/**
 * bKash service stub
 * - This module provides helpers to interact with bKash.
 * - For sandbox testing you can use BKASH_MODE=sandbox and fill sandbox credentials in .env
 * - The current functions simulate responses when credentials are missing.
 *
 * Replace the internal endpoints and payloads with the official bKash API as needed.
 */
const axios = require('axios');

const BKASH_MODE = process.env.BKASH_MODE || 'sandbox';
const APP_KEY = process.env.BKASH_APP_KEY;
const APP_SECRET = process.env.BKASH_APP_SECRET;

// NOTE: official endpoints and payloads must match bKash docs. This is a simplified helper.
async function grantToken(){
  if(!APP_KEY || !APP_SECRET){
    // simulate
    return { id_token: 'SIMULATED_TOKEN', expires_in: 3600 };
  }
  // Example (uncomment + modify to use real endpoints)
  // const url = BKASH_MODE === 'sandbox' ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/token/grant' : 'https://checkout.pay.bka.sh/v1.2.0-beta/token/grant';
  // const resp = await axios.post(url, { app_key: APP_KEY, app_secret: APP_SECRET });
  // return resp.data;
  return { id_token: 'SIMULATED_TOKEN', expires_in: 3600 };
}

async function createPayment({ amount, paymentId, intent='sale' }){
  // In real flow: call create-payment endpoint with token from grantToken()
  const tokenResp = await grantToken();
  // If running simulated mode, return a fake checkout object
  return {
    mode: BKASH_MODE,
    token: tokenResp.id_token,
    paymentRequest: {
      paymentID: 'SIMULATED_BKASH_PAYMENT_ID_' + String(paymentId).slice(0,8),
      paymentUrl: 'https://sandbox.bkash.com/checkout/simulated/' + String(paymentId).slice(0,8),
      amount
    }
  };
}

async function executePayment({ paymentID }){
  // In real flow: call execute-payment endpoint
  if(!paymentID) return { status: 'failed' };
  return { status: 'success', transactionId: 'SIM_TX_' + paymentID.slice(-8) };
}

module.exports = { grantToken, createPayment, executePayment };
