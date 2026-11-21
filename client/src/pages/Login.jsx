import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.usuario);
      navigate(data.usuario.isAdmin ? '/admin' : '/painel');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao fazer login.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ fontFamily: 'Playfair Display,Georgia,serif', fontWeight: 700, fontSize: 28, color: 'var(--brand)', textDecoration: 'none' }}>AlphaDocs</Link>
          <p style={{ color: 'var(--text-2)', marginTop: 8, fontSize: 15 }}>Acesse sua conta</p>
        </div>
        <div className="card">
          {erro && <div className="alert alert-error">{erro}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <label className="field-label">E-mail</label>
              <input className="input" type="email" required autoFocus value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="seu@email.com" />
            </div>
            <div className="mb-2">
              <label className="field-label">Senha</label>
              <input className="input" type="password" required value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="••••••••" />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <Link to="/esqueci-senha" style={{ fontSize: 13 }}>Esqueci minha senha</Link>
            </div>
            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Entrando...</> : 'Entrar'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-2)' }}>
            Não tem conta? <Link to="/cadastro">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
