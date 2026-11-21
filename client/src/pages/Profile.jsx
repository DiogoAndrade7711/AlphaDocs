import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ nome: user?.nome || '', whatsapp: user?.whatsapp || '' });
  const [pwForm, setPwForm] = useState({ senha_atual: '', nova_senha: '', confirmar: '' });
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('dados');

  async function saveProfile(e) {
    e.preventDefault();
    setMsg(''); setErro(''); setLoading(true);
    try {
      const { data } = await api.patch('/auth/profile', form);
      updateUser(data);
      setMsg('Dados atualizados com sucesso!');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar.');
    } finally { setLoading(false); }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.nova_senha !== pwForm.confirmar) { setErro('As senhas não coincidem.'); return; }
    setMsg(''); setErro(''); setLoading(true);
    try {
      await api.patch('/auth/change-password', { senha_atual: pwForm.senha_atual, nova_senha: pwForm.nova_senha });
      setMsg('Senha alterada com sucesso!');
      setPwForm({ senha_atual: '', nova_senha: '', confirmar: '' });
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao alterar senha.');
    } finally { setLoading(false); }
  }

  const affiliateLink = `${window.location.origin}/cadastro?ref=${user?.codigo_afiliado || ''}`;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 600 }}>
        <h1 style={{ fontSize: 26, marginBottom: 24 }}>Meu perfil</h1>

        <div className="tabs">
          {['dados', 'senha', 'afiliado'].map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => { setTab(t); setMsg(''); setErro(''); }}>
              {t === 'dados' ? 'Meus dados' : t === 'senha' ? 'Senha' : 'Afiliados'}
            </button>
          ))}
        </div>

        {msg && <div className="alert alert-success">{msg}</div>}
        {erro && <div className="alert alert-error">{erro}</div>}

        {tab === 'dados' && (
          <div className="card">
            <form onSubmit={saveProfile}>
              <div className="mb-2">
                <label className="field-label">Nome completo</label>
                <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
              </div>
              <div className="mb-2">
                <label className="field-label">E-mail</label>
                <input className="input" value={user?.email || ''} disabled style={{ opacity: .6 }} />
              </div>
              <div className="mb-2">
                <label className="field-label">WhatsApp</label>
                <input className="input" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
              <button className="btn btn-primary w-full" type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </form>
          </div>
        )}

        {tab === 'senha' && (
          <div className="card">
            <form onSubmit={changePassword}>
              <div className="mb-2">
                <label className="field-label">Senha atual</label>
                <input className="input" type="password" required value={pwForm.senha_atual} onChange={e => setPwForm(f => ({ ...f, senha_atual: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="field-label">Nova senha</label>
                <input className="input" type="password" required minLength={8} value={pwForm.nova_senha} onChange={e => setPwForm(f => ({ ...f, nova_senha: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="field-label">Confirmar nova senha</label>
                <input className="input" type="password" required value={pwForm.confirmar} onChange={e => setPwForm(f => ({ ...f, confirmar: e.target.value }))} />
              </div>
              <button className="btn btn-primary w-full" type="submit" disabled={loading}>
                {loading ? 'Alterando...' : 'Alterar senha'}
              </button>
            </form>
          </div>
        )}

        {tab === 'afiliado' && (
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Programa de afiliados</h3>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
              Compartilhe seu link. Você ganha <strong>10% em créditos</strong> sobre cada documento gerado pelos seus indicados.
            </p>
            <label className="field-label">Seu link de indicação</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={affiliateLink} readOnly style={{ fontSize: 13 }} />
              <button onClick={() => navigator.clipboard.writeText(affiliateLink).then(() => alert('Link copiado!'))} className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                Copiar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
