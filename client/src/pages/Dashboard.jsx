import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

export default function Dashboard() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/documents/modules'),
      api.get('/documents/history'),
    ]).then(([m, h]) => {
      setDocs(m.data.slice(0, 6));
      setRecentDocs(h.data.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="mb-3">
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Olá, {user?.nome?.split(' ')[0]} 👋</h1>
          <p style={{ color: 'var(--text-2)' }}>Você tem <strong>{user?.creditos || 0} crédito{user?.creditos !== 1 ? 's' : ''}</strong> disponíveis.</p>
        </div>

        {/* Stats rápidos */}
        <div className="grid-4 mb-3">
          {[
            { label: 'Créditos', value: user?.creditos || 0, color: 'var(--brand)' },
            { label: 'Documentos gerados', value: recentDocs.length, color: '#059669' },
            { label: 'Tipos disponíveis', value: docs.length, color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{s.label}</div>
            </div>
          ))}
          <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Link to="/painel/creditos" className="btn btn-primary btn-sm">+ Comprar créditos</Link>
          </div>
        </div>

        {/* Documentos em destaque */}
        <div className="flex-between mb-2">
          <h2 style={{ fontSize: 18 }}>Gerar documento</h2>
          <Link to="/painel/documentos" style={{ fontSize: 14 }}>Ver todos →</Link>
        </div>
        <div className="grid-3 mb-3">
          {docs.map(d => (
            <Link key={d.codigo} to={`/painel/documentos/${d.codigo}`} style={{ textDecoration: 'none' }}>
              <div className="card card-sm fade-in" style={{ cursor: 'pointer', transition: 'box-shadow var(--transition), transform var(--transition)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{d.icone_url || '📄'}</div>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>{d.nome_exibicao}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{d.descricao || 'Documento profissional'}</div>
                <span className="badge badge-blue">{d.preco_creditos} crédito{d.preco_creditos !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Histórico recente */}
        {recentDocs.length > 0 && (
          <>
            <div className="flex-between mb-2">
              <h2 style={{ fontSize: 18 }}>Gerados recentemente</h2>
              <Link to="/painel/historico" style={{ fontSize: 14 }}>Ver histórico →</Link>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Documento</th><th>Data</th><th>Créditos</th><th></th></tr></thead>
                  <tbody>
                    {recentDocs.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 500 }}>{d.nome_documento}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                        <td><span className="badge badge-blue">{d.creditos_cobrados}</span></td>
                        <td><DownloadBtn id={d.id} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DownloadBtn({ id }) {
  const [loading, setLoading] = useState(false);
  async function download() {
    setLoading(true);
    try {
      const { data } = await api.get(`/documents/download/${id}`);
      window.open(data.url, '_blank');
    } catch { alert('Erro ao gerar link de download.'); }
    finally { setLoading(false); }
  }
  return (
    <button onClick={download} disabled={loading} className="btn btn-ghost btn-sm">
      {loading ? '...' : '⬇ PDF'}
    </button>
  );
}
