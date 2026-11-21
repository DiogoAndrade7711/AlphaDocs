import { Router } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../services/supabase.js';
import { payment } from '../services/payment.js';
import { config } from '../config.js';

const router = Router();

// POST /webhooks/mercadopago
router.post('/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;

    // Verificar assinatura
    const xSignature = req.headers['x-signature'] || '';
    const xRequestId = req.headers['x-request-id'] || '';
    const dataId = data?.id;

    if (config.mercadopago.webhookSecret && dataId) {
      const valid = payment.verifyWebhookSignature(req.rawBody, xSignature, xRequestId, dataId);
      if (!valid) {
        console.warn('[webhook] assinatura inválida');
        return res.status(401).json({ erro: 'Assinatura inválida.' });
      }
    }

    if (type === 'payment' && dataId) {
      const paymentData = await payment.getPayment(dataId);
      if (paymentData.status === 'approved') {
        const { data: deposit } = await supabaseAdmin
          .from('deposits')
          .select('id, user_id, creditos, status')
          .eq('payment_id', String(dataId))
          .maybeSingle();

        if (deposit && deposit.status !== 'aprovado') {
          await supabaseAdmin.from('deposits').update({ status: 'aprovado' }).eq('id', deposit.id);
          await supabaseAdmin.rpc('add_credits', { p_user_id: deposit.user_id, p_amount: deposit.creditos });
          await supabaseAdmin.from('credit_history').insert({
            user_id: deposit.user_id,
            tipo: 'deposito',
            valor: deposit.creditos,
            descricao: `Compra via Pix — ${deposit.creditos} crédito${deposit.creditos > 1 ? 's' : ''}`,
            deposit_id: deposit.id,
          });
          await supabaseAdmin.from('notifications').insert({
            user_id: deposit.user_id,
            titulo: 'Pagamento confirmado!',
            mensagem: `${deposit.creditos} crédito${deposit.creditos > 1 ? 's foram adicionados' : ' foi adicionado'} à sua conta.`,
            tipo: 'sucesso',
          });
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[webhook/mp]', err.message);
    res.status(500).send('Erro');
  }
});

// POST /webhooks/docs — webhook da API de documentos
router.post('/docs', async (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    if (config.docsApi.webhookSecret && signature) {
      const expected = crypto
        .createHmac('sha256', config.docsApi.webhookSecret)
        .update(req.rawBody || '')
        .digest('hex');
      if (expected !== signature) {
        return res.status(401).json({ erro: 'Assinatura inválida.' });
      }
    }
    // Processar evento conforme necessário
    console.log('[webhook/docs]', req.body?.tipo || 'evento');
    res.status(200).send('OK');
  } catch (err) {
    console.error('[webhook/docs]', err.message);
    res.status(500).send('Erro');
  }
});

export default router;
