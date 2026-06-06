import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccessControlPage } from './pages/AccessControlPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { LoginPage } from './pages/LoginPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { ProductsPage } from './pages/ProductsPage';
import { SearchWorkbenchPage } from './pages/SearchWorkbenchPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/search" element={<SearchWorkbenchPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id/edit" element={<ProductFormPage />} />
          <Route path="/access-control" element={<AccessControlPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
