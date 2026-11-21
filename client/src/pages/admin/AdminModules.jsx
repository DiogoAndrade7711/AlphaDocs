import { useState, useEffect } from 'react';
import api from '../../api.js';

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  function load() {
    setLoading(true);
    api.get('/admin/modules').then(({ data }) => setModules(data)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function sync() {
    setSyncing(true); setMsg(''); setErro('');
    try {
      const { data } = await api.post('/admin/modules/sync');
      setMsg(data.mensagem); load();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao sincronizar.'); }
    finally { setSyncing(false); }
  }

  async function save() {
    setErro(''); setMsg('');
    try {
      await api.patch(`/admin/modules/${editing.id}`, form);
      setMsg('Módulo atualizado.'); setEditing(null); load();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar.'); }
  }

  async function toggle(mod) {
    await api.patch(`/admin/modules/${mod.id}`, { ativo: !mod.ativo });
    load();
  }

  return (
    <div className="page">
      <div className="container">
        <div className="flex-between mb-3">
          <h1 style={{ fontSize: 24 }}>Módulos / Documentos</h1>
          <button onClick={sync} disabled={syncing} className="btn btn-primary">
            {syncing ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Sincronizando...</> : '🔄 Atualizar catálogo'}
          </button>
        </div>

        {msg && <div className="alert alert-success mb-2">{msg}</div>}
        {erro && <div className="alert alert-error mb-2">{erro}</div>}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            {loading ? <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div> : (
              <table>
                <thead><tr><th>Código</th><th>Nome de exibição</th><th>Preço (créditos)</th><th>Ordem</th><th>Ativo</th><th></th></tr></thead>
                <tbody>
                  {modules.map(m => (
                    <tr key={m.id}>
                      <td><span className="badge badge-gray">{m.codigo}</span></td>
                      <td style={{ fontWeight: 500 }}>{m.nome_exibicao}</td>
                      <td><span className="badge badge-blue">{m.preco_creditos}</span></td>
                      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{m.ordem}</td>
                      <td>
                        <button onClick={() => toggle(m)} style={{ background: m.ativo ? '#16a34a' : 'var(--border)', width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .15s' }}>
                          <span style={{ position: 'absolute', top: 2, left: m.ativo ? 18 : 2, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'left .15s' }} />
                        </button>
                      </td>
                      <td>
                        <button onClick={() => { setEditing(m); setForm({ nome_exibicao: m.nome_exibicao, descricao: m.descricao, preco_creditos: m.preco_creditos, icone_url: m.icone_url, ordem: m.ordem }); }} className="btn btn-ghost btn-sm">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal edição */}
        {editing && (
          <div className="modal-overlay" onClick={() => setEditing(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <strong>Editar: {editing.codigo}</strong>
                <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>
              <div className="modal-body">
                <div className="mb-2"><label className="field-label">Nome de exibição</label><input className="input" value={form.nome_exibicao || ''} onChange={e => setForm(f => ({ ...f, nome_exibicao: e.target.value }))} /></div>
                <div className="mb-2"><label className="field-label">Descrição</label><textarea className="input" rows={2} value={form.descricao || ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
                <div className="mb-2"><label className="field-label">Preço em créditos</label><input className="input" type="number" min={1} value={form.preco_creditos || 1} onChange={e => setForm(f => ({ ...f, preco_creditos: parseInt(e.target.value) }))} /></div>
                <div className="mb-2"><label className="field-label">Ícone (emoji ou URL)</label><input className="input" value={form.icone_url || ''} onChange={e => setForm(f => ({ ...f, icone_url: e.target.value }))} placeholder="📄 ou https://..." /></div>
                <div className="mb-2"><label className="field-label">Ordem</label><input className="input" type="number" value={form.ordem ?? 0} onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) }))} /></div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setEditing(null)} className="btn btn-secondary">Cancelar</button>
                <button onClick={save} className="btn btn-primary">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
