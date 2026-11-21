import { useState, useEffect, useCallback } from 'react';
import api from '../../api.js';

export default function AdminGenerated() {
  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/generated', { params: { q, page } })
      .then(({ data }) => { setDocs(data.data); setTotal(data.total); })
      .finally(() => setLoading(false));
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  async function downloadPdf(id) {
    try {
      const { data } = await api.get(`/documents/download/${id}`);
      window.open(data.url, '_blank');
    } catch { alert('Erro ao gerar link.'); }
  }

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Documentos gerados</h1>

        <input className="input" style={{ maxWidth: 300, marginBottom: 20 }} placeholder="Buscar documento..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            {loading ? <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div> : (
              <table>
                <thead><tr><th>Usuário</th><th>Documento</th><th>Créditos</th><th>Data</th><th></th></tr></thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{d.profiles?.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{d.profiles?.email}</div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{d.nome_documento}</td>
                      <td><span className="badge badge-blue">{d.creditos_cobrados}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>
                        {d.pdf_path && <button onClick={() => downloadPdf(d.id)} className="btn btn-ghost btn-sm">⬇ PDF</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary btn-sm">‹</button>
          <span style={{ lineHeight: '32px', fontSize: 13 }}>Página {page} · {total} documentos</span>
          <button disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm">›</button>
        </div>
      </div>
    </div>
  );
}
