import { useState, useEffect } from 'react';
import api from '../../api.js';

const ACTION_LABELS = {
  editar_usuario: 'Editar usuário',
  trocar_senha_usuario: 'Trocar senha',
  bloquear_usuario: 'Bloquear usuário',
  desbloquear_usuario: 'Desbloquear usuário',
  ajuste_creditos: 'Ajuste de créditos',
  tornar_admin: 'Tornar admin',
  remover_admin: 'Remover admin',
  aprovar_deposito: 'Aprovar depósito',
  recusar_deposito: 'Recusar depósito',
  editar_modulo: 'Editar módulo',
  sincronizar_catalogo: 'Sincronizar catálogo',
  editar_configuracoes: 'Editar configurações',
};

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/audit').then(({ data }) => setLogs(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ fontSize: 24, marginBottom: 24 }}>Registro de auditoria</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>Todas as ações administrativas ficam registradas aqui.</p>

        {logs.length === 0 ? (
          <div className="empty-state"><p>Nenhuma ação registrada.</p></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Data</th><th>Admin</th><th>Ação</th><th>Detalhes</th></tr></thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                      <td style={{ fontSize: 13 }}>{l.profiles?.nome || '—'}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: 12 }}>{ACTION_LABELS[l.acao] || l.acao}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 300, wordBreak: 'break-word' }}>
                        {l.detalhes ? JSON.stringify(l.detalhes, null, 0).slice(0, 120) : '—'}
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
