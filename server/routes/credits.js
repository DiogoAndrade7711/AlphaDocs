import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../services/supabase.js';
import { payment } from '../services/payment.js';

const router = Router();

// GET /credits — saldo e extrato
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin.from('profiles').select('creditos').eq('id', req.userId).single();
    const { data: history } = await supabaseAdmin
      .from('credit_history')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    res.json({ creditos: profile?.creditos || 0, historico: history || [] });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar créditos.' });
  }
});

// POST /credits/buy — criar pagamento Pix
router.post('/buy', requireAuth, async (req, res) => {
  try {
    const { quantidade } = req.body; // quantidade de créditos
    if (!quantidade || quantidade < 1) return res.status(400).json({ erro: 'Quantidade inválida.' });

    const { data: settings } = await supabaseAdmin.from('settings').select('preco_credito').single();
    const precoCreditoBRL = settings?.preco_credito || 25.0;
    const totalBRL = parseFloat((quantidade * precoCreditoBRL).toFixed(2));

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, nome')
      .eq('id', req.userId)
      .single();

    const pix = await payment.createPixPayment({
      userId: req.userId,
      credits: quantidade,
      amountBRL: totalBRL,
      email: profile.email,
      name: profile.nome,
    });

    // Registrar depósito pendente
    const { data: deposit } = await supabaseAdmin.from('deposits').insert({
      user_id: req.userId,
      payment_id: String(pix.paymentId),
      valor_brl: totalBRL,
      creditos: quantidade,
      status: 'pendente',
      pix_qr_code: pix.qrCode,
      pix_qr_base64: pix.qrCodeBase64,
      expires_at: pix.expiresAt,
    }).select('id').single();

    res.json({ ...pix, deposit_id: deposit?.id, valor_brl: totalBRL, creditos: quantidade });
  } catch (err) {
    console.error('[buy credits]', err.message);
    res.status(500).json({ erro: 'Erro ao criar pagamento.' });
  }
});

// GET /credits/deposits — histórico de depósitos
router.get('/deposits', requireAuth, async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('deposits')
      .select('id, valor_brl, creditos, status, created_at, expires_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(30);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar depósitos.' });
  }
});

// GET /credits/notifications
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(30);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar notificações.' });
  }
});

// PATCH /credits/notifications/:id/read
router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await supabaseAdmin.from('notifications').update({ lida: true }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ erro: 'Erro ao marcar notificação.' });
  }
});

export default router;
