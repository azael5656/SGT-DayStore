import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Layout from './components/Layout';
import AlertasPage from './pages/AlertasPage';
import AuditoriaPage from './pages/AuditoriaPage';
import DashboardPage from './pages/DashboardPage';
import HistoricoPage from './pages/HistoricoPage';
import HomePage from './pages/HomePage';
import InventarioPage from './pages/InventarioPage';
import LoginPage from './pages/LoginPage';
import PerfilPage from './pages/PerfilPage';
import UsuariosPage from './pages/UsuariosPage';
import VentasPage from './pages/VentasPage';

/**
 * El "/" es ahora un hub con quick-access cards por rol.
 * El dashboard IoT completo vive en "/dashboard-detalle".
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <HomePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard-detalle"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventario"
        element={
          <ProtectedRoute>
            <Layout>
              <InventarioPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/alertas"
        element={
          <ProtectedRoute>
            <Layout>
              <AlertasPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ventas"
        element={
          <ProtectedRoute>
            <Layout>
              <VentasPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/auditoria"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <Layout>
              <AuditoriaPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/historico"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <Layout>
              <HistoricoPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute roles={['admin', 'superadmin']}>
            <Layout>
              <UsuariosPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Layout>
              <PerfilPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
