import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { CartProvider } from './lib/cart';
import { CustomerAuthProvider } from './lib/auth';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CustomerAuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </CustomerAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
