import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrdersList from './pages/orders/OrdersList';
import ProductsList from './pages/products/ProductsList';
import BranchesList from './pages/branches/BranchesList';
import UsersList from './pages/users/UsersList';
import ImportPage from './pages/import/ImportPage';
import DeliverySettings from './pages/settings/DeliverySettings';
import AdminAccountsPage from './pages/accounts/AdminAccountsPage';
import PromotionsPage from './pages/promotions/PromotionsPage';
import Sidebar from './components/Sidebar';

function PrivateRoute({ children }) {
    const token = localStorage.getItem('efes_admin_token');
    return token ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/admin/login" element={<Login />} />
                <Route path="/admin/*" element={
                    <PrivateRoute>
                        <div className="admin-layout">
                            <Sidebar />
                            <div className="main-content">
                                <Routes>
                                    <Route index element={<Dashboard />} />
                                    <Route path="orders" element={<OrdersList />} />
                                    <Route path="products" element={<ProductsList />} />
                                    <Route path="branches" element={<BranchesList />} />
                                    <Route path="users" element={<UsersList />} />
                                    <Route path="import" element={<ImportPage />} />
                                    <Route path="delivery" element={<DeliverySettings />} />
                                    <Route path="accounts" element={<AdminAccountsPage />} />
                                    <Route path="promotions" element={<PromotionsPage />} />
                                </Routes>
                            </div>
                        </div>
                    </PrivateRoute>
                } />
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
