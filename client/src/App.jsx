import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DocumentList from './pages/DocumentList.jsx';
import DocumentForm from './pages/DocumentForm.jsx';
import Preview from './pages/Preview.jsx';
import History from './pages/History.jsx';
import Credits from './pages/Credits.jsx';
import Profile from './pages/Profile.jsx';
import Layout from './components/Layout.jsx';

import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminDeposits from './pages/admin/AdminDeposits.jsx';
import AdminModules from './pages/admin/AdminModules.jsx';
import AdminGenerated from './pages/admin/AdminGenerated.jsx';
import AdminApi from './pages/admin/AdminApi.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import AdminAudit from './pages/admin/AdminAudit.jsx';

import WhatsAppButton from './components/WhatsAppButton.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner spinner-lg" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/painel" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />

          <Route path="/painel" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="documentos" element={<DocumentList />} />
            <Route path="documentos/:codigo" element={<DocumentForm />} />
            <Route path="documentos/:codigo/preview" element={<Preview />} />
            <Route path="historico" element={<History />} />
            <Route path="creditos" element={<Credits />} />
            <Route path="perfil" element={<Profile />} />
          </Route>

          <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index element={<AdminDashboard />} />
            <Route path="usuarios" element={<AdminUsers />} />
            <Route path="depositos" element={<AdminDeposits />} />
            <Route path="documentos" element={<AdminGenerated />} />
            <Route path="modulos" element={<AdminModules />} />
            <Route path="api" element={<AdminApi />} />
            <Route path="configuracoes" element={<AdminSettings />} />
            <Route path="auditoria" element={<AdminAudit />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <WhatsAppButton />
      </BrowserRouter>
    </AuthProvider>
  );
}
