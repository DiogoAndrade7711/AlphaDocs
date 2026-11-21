import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

export default function Layout() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.get('/credits/notifications').then(({ data }) => setNotifications(data)).catch(() => {});
  }, []);

  function handleLogout() {
    logout();
    navigate('/');
  }

  async function markRead(id) {
    await api.patch(`/credits/notifications/${id}/read`);
    setNotifications(n => n.map(x => x.id === id ? { ...x, lida: true } : x));
  }

  const unread = notifications.filter(n => !n.lida).length;

  const navItems = [
    { to: '/painel', label: 'Início', end: true },
    { to: '/painel/documentos', label: 'Documentos' },
    { to: '/painel/historico', label: 'Meus Docs' },
    { to: '/painel/creditos', label: 'Créditos' },
    { to: '/painel/perfil', label: 'Perfil' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50, boxShadow: 'var(--shadow)' }}>
        <div className="container" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 700, fontSize: 20, color: 'var(--brand)' }}>AlphaDocs</span>
            <div className="nav-links" style={{ display: 'flex', gap: 4 }}>
              {navItems.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end}
                  style={({ isActive }) => ({
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500,
                    color: isActive ? 'var(--brand)' : 'var(--text-2)',
                    background: isActive ? 'var(--brand-light)' : 'transparent',
                    textDecoration: 'none', transition: 'all var(--transition)',
                  })}>
                  {item.label}
                </NavLink>
              ))}
              {user?.isAdmin && (
                <NavLink to="/admin" style={({ isActive }) => ({
                  padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500,
                  color: isActive ? 'var(--brand)' : 'var(--text-2)', background: isActive ? 'var(--brand-light)' : 'transparent',
                  textDecoration: 'none',
                })}>Admin</NavLink>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Créditos */}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)', background: 'var(--brand-light)', padding: '4px 12px', borderRadius: 999, border: '1px solid var(--brand-border)' }}>
              {user?.creditos ?? 0} crédito{user?.creditos !== 1 ? 's' : ''}
            </span>

            {/* Notificações */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotif(!showNotif)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-sm)', position: 'relative' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unread > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>
                )}
              </button>
              {showNotif && (
                <div style={{ position: 'absolute', right: 0, top: 40, width: 300, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', zIndex: 100, maxHeight: 360, overflowY: 'auto' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>Notificações</div>
                  {notifications.length === 0 ? <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-2)', fontSize: 14 }}>Nenhuma notificação</p> : notifications.map(n => (
                    <div key={n.id} onClick={() => markRead(n.id)} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.lida ? 'transparent' : 'var(--brand-light)', opacity: n.lida ? .7 : 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{n.titulo}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{n.mensagem}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Usuário */}
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">{user?.nome?.split(' ')[0]} · Sair</button>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
