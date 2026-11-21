import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ nome: '', email: '', whatsapp: '', senha: '', aceitou_termos: false });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.aceitou_termos) { setErro('Você precisa aceitar os Termos de Uso.'); return; }
    setErro(''); setLoading(true);
    try {
      const payload = { ...form, codigo_afiliado: params.get('ref') };
      const { data } = await api.post('/auth/register', payload);
      login(data.token, data.usuario);
      navigate('/painel');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao criar conta.');
    } finally { setLoading(false); }
  }

  function maskPhone(v) {
    return v.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3').replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3').replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ fontFamily: 'Playfair Display,Georgia,serif', fontWeight: 700, fontSize: 28, color: 'var(--brand)', textDecoration: 'none' }}>AlphaDocs</Link>
          <p style={{ color: 'var(--text-2)', marginTop: 8, fontSize: 15 }}>Crie sua conta gratuita</p>
        </div>
        <div className="card">
          {erro && <div className="alert alert-error">{erro}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <label className="field-label">Nome completo</label>
              <input className="input" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Seu nome" />
            </div>
            <div className="mb-2">
              <label className="field-label">E-mail</label>
              <input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="seu@email.com" />
            </div>
            <div className="mb-2">
              <label className="field-label">WhatsApp</label>
              <input className="input" required value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: maskPhone(e.target.value) }))} placeholder="(84) 99999-9999" maxLength={15} />
            </div>
            <div className="mb-2">
              <label className="field-label">Senha <span style={{ fontSize: 12, color: 'var(--text-3)' }}>(mín. 8 caracteres)</span></label>
              <input className="input" type="password" required minLength={8} value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="••••••••" />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '16px 0 20px' }}>
              <input type="checkbox" id="termos" checked={form.aceitou_termos} onChange={e => setForm(f => ({ ...f, aceitou_termos: e.target.checked }))} style={{ marginTop: 2 }} />
              <label htmlFor="termos" style={{ fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
                Li e aceito os <a href="#termos-modal" style={{ color: 'var(--brand)' }}>Termos de Uso</a>. Os documentos são modelos para fins legítimos. É proibido usá-los para enganar pessoas ou cometer atos ilegais.
              </label>
            </div>
            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Criando...</> : 'Criar conta'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-2)' }}>
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
