import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AccountPage } from './pages/AccountPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { OrderLookupPage } from './pages/OrderLookupPage';
import { OrderStatusPage } from './pages/OrderStatusPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { RegisterPage } from './pages/RegisterPage';
import { ShopPage } from './pages/ShopPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/track-order" element={<OrderLookupPage />} />
        <Route path="/orders/:id" element={<OrderStatusPage />} />
        <Route path="/catalog" element={<Navigate to="/shop" replace />} />
      </Route>
    </Routes>
  );
}
