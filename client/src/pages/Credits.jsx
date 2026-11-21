import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

const OPCOES = [1, 3, 5, 10];

export default function Credits() {
  const { user } = useAuth();
  const [tab, setTab] = useState('comprar');
  const [qtd, setQtd] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState(null);
  const [history, setHistory] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [erro, setErro] = useState('');
  const [preco, setPreco] = useState(25);

  useEffect(() => {
    api.get('/credits').then(({ data }) => { setHistory(data.historico); });
    api.get('/credits/deposits').then(({ data }) => setDeposits(data));
    api.get('/admin/settings').catch(() => {}).then(r => { if (r?.data?.preco_credito) setPreco(r.data.preco_credito); });
  }, []);

  async function buy() {
    setErro(''); setLoading(true); setPix(null);
    try {
      const { data } = await api.post('/credits/buy', { quantidade: qtd });
      setPix(data);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao criar pagamento.');
    } finally { setLoading(false); }
  }

  async function copyPix() {
    await navigator.clipboard.writeText(pix.qrCode);
    alert('Código copiado!');
  }

  const total = (qtd * preco).toFixed(2);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Créditos</h1>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)', marginBottom: 24 }}>
          {user?.creditos || 0} crédito{user?.creditos !== 1 ? 's' : ''} disponíveis
        </div>

        <div className="tabs">
          {['comprar', 'extrato', 'depositos'].map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'comprar' ? 'Comprar créditos' : t === 'extrato' ? 'Extrato' : 'Meus pagamentos'}
            </button>
          ))}
        </div>

        {tab === 'comprar' && (
          <div>
            {!pix ? (
              <div className="card" style={{ maxWidth: 480 }}>
                <h3 style={{ marginBottom: 20 }}>Quanto deseja comprar?</h3>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  {OPCOES.map(o => (
                    <button key={o} onClick={() => setQtd(o)}
                      style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: '2px solid', cursor: 'pointer', fontWeight: 600,
                        background: qtd === o ? 'var(--brand)' : 'var(--surface)', color: qtd === o ? '#fff' : 'var(--text)', borderColor: qtd === o ? 'var(--brand)' : 'var(--border)' }}>
                      {o} crédito{o !== 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="field-label">Quantidade personalizada</label>
                  <input className="input" type="number" min={1} max={100} value={qtd} onChange={e => setQtd(Math.max(1, parseInt(e.target.value) || 1))} style={{ maxWidth: 120 }} />
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span>{qtd} crédito{qtd !== 1 ? 's' : ''} × R$ {preco.toFixed(2)}</span>
                    <strong>R$ {total}</strong>
                  </div>
                </div>
                {erro && <div className="alert alert-error">{erro}</div>}
                <button onClick={buy} disabled={loading} className="btn btn-primary btn-lg w-full">
                  {loading ? 'Gerando Pix...' : `Pagar R$ ${total} via Pix`}
                </button>
              </div>
            ) : (
              <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
                <h3 style={{ marginBottom: 4 }}>Pix gerado!</h3>
                <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>Escaneie o QR Code ou copie o código. Os créditos são liberados automaticamente.</p>
                {pix.qrCodeBase64 && (
                  <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix" style={{ width: 220, height: 220, margin: '0 auto 16px', display: 'block', borderRadius: 8 }} />
                )}
                {pix.qrCode && (
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 11, wordBreak: 'break-all', marginBottom: 12, textAlign: 'left' }}>
                    {pix.qrCode}
                  </div>
                )}
                <button onClick={copyPix} className="btn btn-secondary w-full mb-1">Copiar código Pix</button>
                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Valor: <strong>R$ {pix.valor_brl}</strong> · {pix.creditos} crédito{pix.creditos !== 1 ? 's' : ''}</p>
                <button onClick={() => setPix(null)} className="btn btn-ghost btn-sm mt-2">Gerar novo Pix</button>
              </div>
            )}
          </div>
        )}

        {tab === 'extrato' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {history.length === 0 ? <p style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Nenhuma movimentação.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Tipo</th><th>Descrição</th><th>Créditos</th><th>Data</th></tr></thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id}>
                        <td><span className={`badge ${h.valor > 0 ? 'badge-green' : 'badge-red'}`}>{h.tipo}</span></td>
                        <td style={{ fontSize: 13 }}>{h.descricao}</td>
                        <td style={{ fontWeight: 700, color: h.valor > 0 ? '#16a34a' : '#dc2626' }}>{h.valor > 0 ? '+' : ''}{h.valor}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{new Date(h.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'depositos' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {deposits.length === 0 ? <p style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>Nenhum pagamento.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Data</th><th>Valor</th><th>Créditos</th><th>Status</th></tr></thead>
                  <tbody>
                    {deposits.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontSize: 13 }}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>R$ {parseFloat(d.valor_brl).toFixed(2)}</td>
                        <td>{d.creditos}</td>
                        <td><span className={`badge ${d.status === 'aprovado' ? 'badge-green' : d.status === 'recusado' ? 'badge-red' : 'badge-yellow'}`}>{d.status}</span></td>
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
