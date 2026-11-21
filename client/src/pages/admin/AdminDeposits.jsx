import { useState, useEffect, useCallback } from 'react';
import api from '../../api.js';

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', inicio: '', fim: '', page: 1 });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/deposits', { params: filters })
      .then(({ data }) => { setDeposits(data.data); setTotal(data.total); })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  async function approve(id) {
    await api.patch(`/admin/deposits/${id}/approve`);
    setMsg('Depósito aprovado.'); load();
  }

  async function reject(id) {
    if (!confirm('Recusar este depósito?')) return;
    await api.patch(`/admin/deposits/${id}/reject`);
    setMsg('Depósito recusado.'); load();
  }

  function exportCSV() {
    const rows = [['ID', 'Usuário', 'Email', 'Valor', 'Créditos', 'Status', 'Data']];
    for (const d of deposits) rows.push([d.id, d.profiles?.nome, d.profiles?.email, d.valor_brl, d.creditos, d.status, new Date(d.created_at).toLocaleString('pt-BR')]);
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'depositos.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="container">
        <div className="flex-between mb-3">
          <h1 style={{ fontSize: 24 }}>Depósitos</h1>
          <button onClick={exportCSV} className="btn btn-secondary btn-sm">⬇ Exportar CSV</button>
        </div>
        {msg && <div className="alert alert-success mb-2">{msg}</div>}

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <select className="input" style={{ maxWidth: 160 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="recusado">Recusado</option>
          </select>
          <input className="input" type="date" style={{ maxWidth: 160 }} value={filters.inicio} onChange={e => setFilters(f => ({ ...f, inicio: e.target.value, page: 1 }))} />
          <input className="input" type="date" style={{ maxWidth: 160 }} value={filters.fim} onChange={e => setFilters(f => ({ ...f, fim: e.target.value, page: 1 }))} />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            {loading ? <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div> : (
              <table>
                <thead><tr><th>Usuário</th><th>Valor</th><th>Créditos</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead>
                <tbody>
                  {deposits.map(d => (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{d.profiles?.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{d.profiles?.email}</div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#059669' }}>R$ {parseFloat(d.valor_brl).toFixed(2)}</td>
                      <td><span className="badge badge-blue">{d.creditos}</span></td>
                      <td><span className={`badge ${d.status === 'aprovado' ? 'badge-green' : d.status === 'recusado' ? 'badge-red' : 'badge-yellow'}`}>{d.status}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>
                        {d.status === 'pendente' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => approve(d.id)} className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', fontSize: 12 }}>Aprovar</button>
                            <button onClick={() => reject(d.id)} className="btn btn-danger btn-sm" style={{ fontSize: 12 }}>Recusar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button disabled={filters.page === 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="btn btn-secondary btn-sm">‹</button>
          <span style={{ lineHeight: '32px', fontSize: 13 }}>Página {filters.page} · {total} depósitos</span>
          <button disabled={filters.page * 30 >= total} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="btn btn-secondary btn-sm">›</button>
        </div>
      </div>
    </div>
  );
}
