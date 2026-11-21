import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setErro(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMsg(data.mensagem);
    } catch { setErro('Erro ao enviar. Tente novamente.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ fontFamily: 'Playfair Display,Georgia,serif', fontWeight: 700, fontSize: 28, color: 'var(--brand)', textDecoration: 'none' }}>AlphaDocs</Link>
          <p style={{ color: 'var(--text-2)', marginTop: 8 }}>Redefinição de senha</p>
        </div>
        <div className="card">
          {msg ? <div className="alert alert-success">{msg}</div> : (
            <>
              {erro && <div className="alert alert-error">{erro}</div>}
              <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>Informe seu e-mail e enviaremos as instruções.</p>
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="field-label">E-mail</label>
                  <input className="input" type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
                <button className="btn btn-primary btn-lg w-full mt-2" type="submit" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar instruções'}
                </button>
              </form>
            </>
          )}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}><Link to="/login">Voltar ao login</Link></p>
        </div>
      </div>
    </div>
  );
}
