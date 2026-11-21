import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Home() {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
        <div className="container" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Playfair Display,Georgia,serif', fontWeight: 700, fontSize: 22, color: 'var(--brand)' }}>AlphaDocs</span>
          <div style={{ display: 'flex', gap: 10 }}>
            {user ? (
              <Link to="/painel" className="btn btn-primary">Ir para o Painel</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">Entrar</Link>
                <Link to="/cadastro" className="btn btn-primary">Criar conta</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, var(--brand-light) 0%, #fff 60%)' }}>
        <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <span className="badge badge-blue" style={{ marginBottom: 16, fontSize: 13 }}>Plataforma de Documentos</span>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', marginBottom: 20, maxWidth: 700, margin: '0 auto 20px' }}>
            Gere documentos profissionais em segundos
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-2)', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Preencha um formulário inteligente e receba seu documento final em PDF, pronto para uso.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/cadastro" className="btn btn-primary btn-lg">Começar agora</Link>
            <Link to="/login" className="btn btn-secondary btn-lg">Já tenho conta</Link>
          </div>
        </div>
      </main>

      {/* Features */}
      <section style={{ background: 'var(--surface)', padding: '60px 20px', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="grid-3" style={{ gap: 24 }}>
            {[
              { icon: '📄', title: 'Formulário inteligente', desc: 'Campos dinâmicos montados automaticamente para cada tipo de documento.' },
              { icon: '👁️', title: 'Prévia antes de gerar', desc: 'Visualize o documento antes de confirmar. Pague só quando estiver satisfeito.' },
              { icon: '⚡', title: 'PDF na hora', desc: 'Gere e baixe o PDF em segundos. Histórico completo na sua área.' },
            ].map(f => (
              <div key={f.title} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)', padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
        © {new Date().getFullYear()} AlphaDocs · <a href="/painel">Entrar</a>
      </footer>
    </div>
  );
}
