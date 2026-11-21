import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nova_senha: '', confirmar: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.nova_senha !== form.confirmar) { setErro('As senhas não coincidem.'); return; }
    setErro(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: params.get('token'), nova_senha: form.nova_senha });
      navigate('/login?reset=1');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao redefinir senha.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ fontFamily: 'Playfair Display,Georgia,serif', fontWeight: 700, fontSize: 28, color: 'var(--brand)', textDecoration: 'none' }}>AlphaDocs</Link>
          <p style={{ color: 'var(--text-2)', marginTop: 8 }}>Nova senha</p>
        </div>
        <div className="card">
          {erro && <div className="alert alert-error">{erro}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <label className="field-label">Nova senha</label>
              <input className="input" type="password" required minLength={8} value={form.nova_senha} onChange={e => setForm(f => ({ ...f, nova_senha: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="field-label">Confirmar senha</label>
              <input className="input" type="password" required value={form.confirmar} onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-lg w-full mt-2" type="submit" disabled={loading}>
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
