import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';

export default function DocumentList() {
  const [docs, setDocs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/documents/modules').then(({ data }) => { setDocs(data); setFiltered(data); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const lower = q.toLowerCase();
    setFiltered(docs.filter(d => d.nome_exibicao.toLowerCase().includes(lower) || d.descricao?.toLowerCase().includes(lower)));
  }, [q, docs]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="mb-3">
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Documentos disponíveis</h1>
          <input className="input" style={{ maxWidth: 360 }} placeholder="Buscar documento..." value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum documento encontrado.</p>
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map(d => (
              <Link key={d.codigo} to={`/painel/documentos/${d.codigo}`} style={{ textDecoration: 'none' }}>
                <div className="card fade-in" style={{ height: '100%', cursor: 'pointer', transition: 'box-shadow var(--transition), transform var(--transition)' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'none'; }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{d.icone_url || '📄'}</div>
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>{d.nome_exibicao}</h3>
                  {d.descricao && <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5 }}>{d.descricao}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span className="badge badge-blue">{d.preco_creditos} crédito{d.preco_creditos !== 1 ? 's' : ''}</span>
                    <span className="btn btn-primary btn-sm">Gerar →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
