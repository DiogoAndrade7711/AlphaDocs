import { MercadoPagoConfig, Payment } from 'mercadopago';
import { config } from '../config.js';
import crypto from 'crypto';

const mp = new MercadoPagoConfig({ accessToken: config.mercadopago.accessToken });
const paymentClient = new Payment(mp);

export const payment = {
  async createPixPayment({ userId, credits, amountBRL, email, name }) {
    const result = await paymentClient.create({
      body: {
        transaction_amount: amountBRL,
        description: `AlphaDocs — ${credits} crédito${credits > 1 ? 's' : ''}`,
        payment_method_id: 'pix',
        payer: { email, first_name: name.split(' ')[0], last_name: name.split(' ').slice(1).join(' ') || '' },
        metadata: { user_id: userId, credits },
        notification_url: `${config.clientUrl.replace('5173', '3001')}/webhooks/mercadopago`,
      },
    });

    return {
      paymentId: result.id,
      status: result.status,
      qrCode: result.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      expiresAt: result.date_of_expiration,
    };
  },

  async getPayment(paymentId) {
    return await paymentClient.get({ id: paymentId });
  },

  verifyWebhookSignature(rawBody, xSignature, xRequestId, dataId) {
    if (!config.mercadopago.webhookSecret) return true; // dev mode
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${xSignature.split(',').find(s => s.startsWith('ts='))?.split('=')[1]};`;
    const ts = xSignature.split(',').find(s => s.startsWith('ts='))?.split('=')[1];
    const v1 = xSignature.split(',').find(s => s.startsWith('v1='))?.split('=')[1];
    const toSign = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const hmac = crypto.createHmac('sha256', config.mercadopago.webhookSecret).update(toSign).digest('hex');
    return hmac === v1;
  },
};
