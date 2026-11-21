import { useState, useEffect } from 'react';
import api from '../../api.js';

function StatCard({ label, value, sub, color = 'var(--brand)' }) {
  return (
    <div className="card card-sm fade-in">
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [topDocs, setTopDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/summary'),
      api.get('/admin/reports/sales'),
      api.get('/admin/reports/top-docs'),
    ]).then(([s, sales, top]) => {
      setData(s.data);
      setSalesData(sales.data || []);
      setTopDocs(top.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>Resumo do sistema</h1>

        <div className="grid-4 mb-3">
          <StatCard label="Usuários" value={data?.total_usuarios} color="#7c3aed" />
          <StatCard label="Depósitos hoje" value={`R$ ${(data?.deposito_hoje_brl || 0).toFixed(2)}`} color="#059669" />
          <StatCard label="Depósitos este mês" value={`R$ ${(data?.deposito_mes_brl || 0).toFixed(2)}`} color="#2563EB" />
          <StatCard label="Docs gerados" value={data?.total_docs_gerados} />
        </div>

        <div className="grid-2">
          {/* Prévias */}
          <StatCard label="Prévias geradas" value={data?.total_previas} sub="Total acumulado" />
          {/* Saldo API */}
          <div className="card card-sm fade-in">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Saldo API externa</div>
            {data?.api_saldo !== undefined ? (
              <div style={{ fontSize: 22, fontWeight: 700, color: data.api_saldo < 20 ? '#dc2626' : '#059669' }}>
                R$ {parseFloat(data.api_saldo || 0).toFixed(2)}
              </div>
            ) : <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Não disponível</div>}
            {data?.api_saldo < 20 && <div className="alert alert-error mt-1" style={{ fontSize: 12, padding: '6px 10px' }}>⚠ Saldo baixo! Recarregue em API → Recarregar.</div>}
          </div>
        </div>

        {topDocs.length > 0 && (
          <div className="mt-3">
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Documentos mais gerados</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Documento</th><th>Total gerado</th></tr></thead>
                  <tbody>
                    {topDocs.map((d, i) => (
                      <tr key={d.modulo_codigo}>
                        <td style={{ color: 'var(--text-2)', fontWeight: 700, width: 40 }}>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{d.nome_documento || d.modulo_codigo}</td>
                        <td><span className="badge badge-blue">{d.total}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {salesData.length > 0 && (
          <div className="mt-3">
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Vendas por dia (últimos 30 dias)</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Data</th><th>Total (R$)</th><th>Depósitos</th></tr></thead>
                  <tbody>
                    {salesData.slice(0, 15).map(s => (
                      <tr key={s.dia}>
                        <td style={{ fontSize: 13 }}>{new Date(s.dia).toLocaleDateString('pt-BR')}</td>
                        <td style={{ fontWeight: 600, color: '#059669' }}>R$ {parseFloat(s.total_brl).toFixed(2)}</td>
                        <td style={{ color: 'var(--text-2)' }}>{s.total_depositos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
