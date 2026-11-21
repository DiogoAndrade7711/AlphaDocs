import { useState, useEffect } from 'react';
import api from '../api.js';

export default function History() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/documents/history').then(({ data }) => setDocs(data)).finally(() => setLoading(false));
  }, []);

  async function download(id) {
    try {
      const { data } = await api.get(`/documents/download/${id}`);
      window.open(data.url, '_blank');
    } catch { alert('Erro ao gerar link.'); }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ fontSize: 26, marginBottom: 24 }}>Meus documentos</h1>
        {docs.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 48 }}>📄</p>
            <p>Nenhum documento gerado ainda.</p>
            <a href="/painel/documentos" className="btn btn-primary" style={{ marginTop: 16 }}>Gerar documento</a>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Documento</th><th>Data</th><th>Créditos</th><th>Download</th></tr></thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 500 }}>{d.nome_documento || d.modulo_codigo}</td>
                      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{new Date(d.created_at).toLocaleString('pt-BR')}</td>
                      <td><span className="badge badge-blue">{d.creditos_cobrados}</span></td>
                      <td>
                        {d.pdf_path ? (
                          <button onClick={() => download(d.id)} className="btn btn-ghost btn-sm">⬇ PDF</button>
                        ) : <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
