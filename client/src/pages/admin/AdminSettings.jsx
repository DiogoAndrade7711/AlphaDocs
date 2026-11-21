import { useState, useEffect } from 'react';
import api from '../../api.js';

export default function AdminSettings() {
  const [form, setForm] = useState({ nome_sistema: '', cor_principal: '#2563EB', preco_credito: 25, whatsapp_suporte: '', termos_de_uso: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/admin/settings').then(({ data }) => { if (data) setForm({ ...form, ...data }); }).finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    setMsg(''); setErro(''); setSaving(true);
    try {
      await api.patch('/admin/settings', form);
      setMsg('Configurações salvas com sucesso!');
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>Configurações</h1>

        {msg && <div className="alert alert-success mb-2">{msg}</div>}
        {erro && <div className="alert alert-error mb-2">{erro}</div>}

        <form onSubmit={save}>
          <div className="card mb-3">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Identidade</h3>
            <div className="mb-2">
              <label className="field-label">Nome do sistema</label>
              <input className="input" value={form.nome_sistema} onChange={e => setForm(f => ({ ...f, nome_sistema: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="field-label">Cor principal</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={form.cor_principal} onChange={e => setForm(f => ({ ...f, cor_principal: e.target.value }))} style={{ width: 48, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                <input className="input" value={form.cor_principal} onChange={e => setForm(f => ({ ...f, cor_principal: e.target.value }))} style={{ maxWidth: 120 }} />
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Preços e pagamento</h3>
            <div className="mb-2">
              <label className="field-label">Preço do crédito (R$)</label>
              <input className="input" type="number" min="1" step="0.01" value={form.preco_credito} onChange={e => setForm(f => ({ ...f, preco_credito: parseFloat(e.target.value) }))} style={{ maxWidth: 160 }} />
              <p className="field-hint">1 crédito = R$ {parseFloat(form.preco_credito).toFixed(2)}</p>
            </div>
          </div>

          <div className="card mb-3">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Contato</h3>
            <div className="mb-2">
              <label className="field-label">WhatsApp de suporte (com código do país)</label>
              <input className="input" value={form.whatsapp_suporte} onChange={e => setForm(f => ({ ...f, whatsapp_suporte: e.target.value }))} placeholder="5584998286504" style={{ maxWidth: 220 }} />
            </div>
          </div>

          <div className="card mb-3">
            <h3 style={{ fontSize: 16, marginBottom: 20 }}>Termos de Uso</h3>
            <textarea className="input" rows={6} value={form.termos_de_uso} onChange={e => setForm(f => ({ ...f, termos_de_uso: e.target.value }))} />
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary btn-lg">
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </form>
      </div>
    </div>
  );
}
