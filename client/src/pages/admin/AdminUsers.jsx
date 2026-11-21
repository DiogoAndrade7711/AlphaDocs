import { useState, useEffect, useCallback } from 'react';
import api from '../../api.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [bloqueado, setBloqueado] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null); // 'edit'|'password'|'credits'
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/users', { params: { q, bloqueado, page } })
      .then(({ data }) => { setUsers(data.data); setTotal(data.total); })
      .finally(() => setLoading(false));
  }, [q, bloqueado, page]);

  useEffect(() => { load(); }, [load]);

  async function openUser(id) {
    const { data } = await api.get(`/admin/users/${id}`);
    setSelected(data);
  }

  async function action(endpoint, body, successMsg) {
    setErro(''); setMsg('');
    try {
      await api.patch(endpoint, body);
      setMsg(successMsg);
      load();
      if (selected) { const { data } = await api.get(`/admin/users/${selected.id}`); setSelected(data); }
    } catch (err) { setErro(err.response?.data?.erro || 'Erro.'); }
  }

  async function addCredits() {
    setErro(''); setMsg('');
    try {
      await api.post(`/admin/users/${selected.id}/credits`, form);
      setMsg('Créditos ajustados.');
      setModal(null); setForm({});
      const { data } = await api.get(`/admin/users/${selected.id}`); setSelected(data);
    } catch (err) { setErro(err.response?.data?.erro || 'Erro.'); }
  }

  async function changePassword() {
    setErro(''); setMsg('');
    try {
      await api.patch(`/admin/users/${selected.id}/password`, { nova_senha: form.nova_senha });
      setMsg('Senha alterada.'); setModal(null); setForm({});
    } catch (err) { setErro(err.response?.data?.erro || 'Erro.'); }
  }

  async function editUser() {
    setErro(''); setMsg('');
    try {
      await api.patch(`/admin/users/${selected.id}`, form);
      setMsg('Dados atualizados.'); setModal(null); setForm({});
      const { data } = await api.get(`/admin/users/${selected.id}`); setSelected(data);
    } catch (err) { setErro(err.response?.data?.erro || 'Erro.'); }
  }

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Usuários</h1>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 280 }} placeholder="Buscar por nome ou e-mail..." value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
          <select className="input" style={{ maxWidth: 160 }} value={bloqueado} onChange={e => { setBloqueado(e.target.value); setPage(1); }}>
            <option value="">Todos</option>
            <option value="false">Ativos</option>
            <option value="true">Bloqueados</option>
          </select>
        </div>

        {/* Tabela */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div className="table-wrap">
            {loading ? <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div> : (
              <table>
                <thead><tr><th>Nome</th><th>E-mail</th><th>Créditos</th><th>Cadastro</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.nome}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{u.email}</td>
                      <td><span className="badge badge-blue">{u.creditos}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                      <td><span className={`badge ${u.bloqueado ? 'badge-red' : 'badge-green'}`}>{u.bloqueado ? 'Bloqueado' : 'Ativo'}</span></td>
                      <td><button onClick={() => openUser(u.id)} className="btn btn-ghost btn-sm">Ver</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Paginação */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary btn-sm">‹</button>
          <span style={{ lineHeight: '32px', fontSize: 13 }}>Página {page} · {total} usuários</span>
          <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm">›</button>
        </div>

        {/* Drawer do usuário selecionado */}
        {selected && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }} onClick={() => setSelected(null)}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,.4)' }} />
            <div onClick={e => e.stopPropagation()} style={{ width: 440, background: 'var(--surface)', height: '100%', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,.12)', padding: 24 }}>
              <div className="flex-between mb-2">
                <h2 style={{ fontSize: 18 }}>{selected.nome}</h2>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-2)' }}>×</button>
              </div>
              {msg && <div className="alert alert-success" style={{ fontSize: 13 }}>{msg}</div>}
              {erro && <div className="alert alert-error" style={{ fontSize: 13 }}>{erro}</div>}

              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
                <div>E-mail: <strong style={{ color: 'var(--text)' }}>{selected.email}</strong></div>
                <div>WhatsApp: {selected.whatsapp || '—'}</div>
                <div>Créditos: <strong style={{ color: 'var(--brand)' }}>{selected.creditos}</strong></div>
                <div>Admin: {selected.is_admin ? '✅ Sim' : '—'}</div>
                <div>Cadastrado: {new Date(selected.created_at).toLocaleDateString('pt-BR')}</div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                <button onClick={() => { setModal('edit'); setForm({ nome: selected.nome, email: selected.email, whatsapp: selected.whatsapp }); }} className="btn btn-secondary btn-sm">Editar dados</button>
                <button onClick={() => { setModal('password'); setForm({}); }} className="btn btn-secondary btn-sm">Trocar senha</button>
                <button onClick={() => { setModal('credits'); setForm({}); }} className="btn btn-secondary btn-sm">Ajustar créditos</button>
                <button onClick={() => action(`/admin/users/${selected.id}/block`, { bloqueado: !selected.bloqueado }, selected.bloqueado ? 'Usuário desbloqueado.' : 'Usuário bloqueado.')} className={`btn btn-sm ${selected.bloqueado ? 'btn-secondary' : 'btn-danger'}`}>
                  {selected.bloqueado ? 'Desbloquear' : 'Bloquear'}
                </button>
                <button onClick={() => action(`/admin/users/${selected.id}/admin`, { isAdmin: !selected.is_admin }, selected.is_admin ? 'Admin removido.' : 'Admin concedido.')} className="btn btn-secondary btn-sm">
                  {selected.is_admin ? 'Remover admin' : 'Tornar admin'}
                </button>
              </div>

              {/* Histórico docs */}
              {selected.docs?.length > 0 && (
                <>
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>Últimos documentos</h3>
                  <div style={{ fontSize: 12 }}>
                    {selected.docs.slice(0, 5).map(d => (
                      <div key={d.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{d.nome_documento}</span>
                        <span style={{ color: 'var(--text-2)' }}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modais */}
        {modal && (
          <div className="modal-overlay" onClick={() => setModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <strong>{modal === 'edit' ? 'Editar dados' : modal === 'password' ? 'Trocar senha' : 'Ajustar créditos'}</strong>
                <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>
              <div className="modal-body">
                {modal === 'edit' && (
                  <>
                    <div className="mb-2"><label className="field-label">Nome</label><input className="input" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
                    <div className="mb-2"><label className="field-label">E-mail</label><input className="input" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                    <div className="mb-2"><label className="field-label">WhatsApp</label><input className="input" value={form.whatsapp || ''} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} /></div>
                  </>
                )}
                {modal === 'password' && (
                  <div className="mb-2"><label className="field-label">Nova senha</label><input className="input" type="password" minLength={8} value={form.nova_senha || ''} onChange={e => setForm(f => ({ ...f, nova_senha: e.target.value }))} /></div>
                )}
                {modal === 'credits' && (
                  <>
                    <div className="mb-2"><label className="field-label">Valor (positivo = adicionar, negativo = remover)</label><input className="input" type="number" value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="Ex: 5 ou -2" /></div>
                    <div className="mb-2"><label className="field-label">Motivo</label><input className="input" value={form.motivo || ''} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Motivo do ajuste" /></div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button onClick={() => setModal(null)} className="btn btn-secondary">Cancelar</button>
                <button onClick={modal === 'edit' ? editUser : modal === 'password' ? changePassword : addCredits} className="btn btn-primary">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
