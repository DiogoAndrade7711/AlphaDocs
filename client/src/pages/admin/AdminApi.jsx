import { useState, useEffect } from 'react';
import api from '../../api.js';

export default function AdminApi() {
  const [account, setAccount] = useState(null);
  const [statement, setStatement] = useState([]);
  const [usage, setUsage] = useState([]);
  const [rechargeForm, setRechargeForm] = useState({ valor: '' });
  const [rechargePix, setRechargePix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [tab, setTab] = useState('conta');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/api-account').catch(() => ({ data: null })),
      api.get('/admin/api-statement').catch(() => ({ data: [] })),
      api.get('/admin/api-usage').catch(() => ({ data: [] })),
    ]).then(([acc, stmt, usg]) => {
      setAccount(acc.data);
      setStatement(Array.isArray(stmt.data) ? stmt.data : (stmt.data?.lancamentos || []));
      setUsage(Array.isArray(usg.data) ? usg.data : (usg.data?.uso || []));
    }).finally(() => setLoading(false));
  }, []);

  async function recharge() {
    setErro(''); setMsg(''); setRecharging(true);
    try {
      const { data } = await api.post('/admin/api-recharge', { valor: parseFloat(rechargeForm.valor) });
      setRechargePix(data);
      setMsg('QR Code gerado. Pague para recarregar o saldo da API.');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao recarregar.');
    } finally { setRecharging(false); }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;

  const saldoBRL = parseFloat(account?.saldo || 0);
  const saldoBaixo = saldoBRL < 15;

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>API externa</h1>

        {/* Saldo */}
        <div className={`alert ${saldoBaixo ? 'alert-error' : 'alert-info'} mb-3`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <strong>Saldo da API:</strong> R$ {saldoBRL.toFixed(2)}
            {saldoBaixo && <span style={{ marginLeft: 8 }}>⚠ Saldo abaixo de R$ 15,00 — recarregue para continuar gerando.</span>}
          </div>
        </div>

        {msg && <div className="alert alert-success mb-2">{msg}</div>}
        {erro && <div className="alert alert-error mb-2">{erro}</div>}

        <div className="tabs">
          {['conta', 'recarregar', 'extrato', 'consumo'].map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'conta' ? 'Conta' : t === 'recarregar' ? 'Recarregar' : t === 'extrato' ? 'Extrato' : 'Consumo'}
            </button>
          ))}
        </div>

        {tab === 'conta' && account && (
          <div className="card" style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              {Object.entries(account).filter(([k]) => !['saldo'].includes(k)).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <span style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                  <strong>{String(v)}</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-2)' }}>Saldo</span>
                <strong style={{ color: saldoBaixo ? '#dc2626' : '#16a34a', fontSize: 18 }}>R$ {saldoBRL.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}

        {tab === 'recarregar' && (
          <div className="card" style={{ maxWidth: 400 }}>
            <h3 style={{ marginBottom: 16 }}>Recarregar saldo da API</h3>
            {!rechargePix ? (
              <>
                <div className="mb-2">
                  <label className="field-label">Valor em R$ (mínimo R$ 20,00)</label>
                  <input className="input" type="number" min="20" step="10" value={rechargeForm.valor} onChange={e => setRechargeForm({ valor: e.target.value })} placeholder="Ex: 50" />
                </div>
                <button onClick={recharge} disabled={recharging || !rechargeForm.valor} className="btn btn-primary w-full">
                  {recharging ? 'Gerando Pix...' : 'Gerar QR Code Pix'}
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                {rechargePix.qr_code_base64 && <img src={`data:image/png;base64,${rechargePix.qr_code_base64}`} alt="QR Code" style={{ width: 200, margin: '0 auto 16px', display: 'block' }} />}
                {rechargePix.qr_code && (
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 11, wordBreak: 'break-all', marginBottom: 12 }}>
                    {rechargePix.qr_code}
                  </div>
                )}
                <button onClick={() => navigator.clipboard.writeText(rechargePix.qr_code).then(() => alert('Copiado!'))} className="btn btn-secondary w-full">Copiar código Pix</button>
                <button onClick={() => setRechargePix(null)} className="btn btn-ghost btn-sm mt-2">Novo Pix</button>
              </div>
            )}
          </div>
        )}

        {tab === 'extrato' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {statement.length === 0 ? <p style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Sem lançamentos.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead>
                  <tbody>
                    {statement.slice(0, 50).map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.data || s.created_at || '—'}</td>
                        <td style={{ fontSize: 13 }}>{s.descricao || s.tipo || '—'}</td>
                        <td style={{ fontWeight: 600, color: parseFloat(s.valor) >= 0 ? '#16a34a' : '#dc2626' }}>R$ {parseFloat(s.valor || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'consumo' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {usage.length === 0 ? <p style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Sem dados de consumo.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Módulo</th><th>Prévias</th><th>Gerados</th><th>Custo</th></tr></thead>
                  <tbody>
                    {usage.map((u, i) => (
                      <tr key={i}>
                        <td>{u.modulo || u.codigo || '—'}</td>
                        <td>{u.previas ?? '—'}</td>
                        <td>{u.gerados ?? '—'}</td>
                        <td style={{ color: '#dc2626' }}>R$ {parseFloat(u.custo || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
