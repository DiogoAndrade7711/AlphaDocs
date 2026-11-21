import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

const NAV = [
  { to: '/admin', label: 'Resumo', icon: '📊', end: true },
  { to: '/admin/usuarios', label: 'Usuários', icon: '👥' },
  { to: '/admin/depositos', label: 'Depósitos', icon: '💰' },
  { to: '/admin/documentos', label: 'Docs Gerados', icon: '📄' },
  { to: '/admin/modulos', label: 'Módulos', icon: '🗂️' },
  { to: '/admin/api', label: 'API Externa', icon: '🔌' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: '⚙️' },
  { to: '/admin/auditoria', label: 'Auditoria', icon: '🔍' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate('/'); }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: 'var(--text)', color: '#fff', flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
          <div style={{ fontFamily: 'Playfair Display,Georgia,serif', fontWeight: 700, fontSize: 18, color: '#93c5fd' }}>AlphaDocs</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>Painel Admin</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'background .15s',
                background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,.65)',
              })}>
              <span>{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.12)' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', marginBottom: 8 }}>{user?.nome?.split(' ')[0]}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <NavLink to="/painel" style={{ fontSize: 12, color: '#93c5fd' }}>Área do usuário</NavLink>
            <span style={{ color: 'rgba(255,255,255,.3)' }}>·</span>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', fontSize: 12, color: 'rgba(255,255,255,.5)', cursor: 'pointer' }}>Sair</button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, background: 'var(--bg)', overflowX: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}
