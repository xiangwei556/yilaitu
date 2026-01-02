import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ModelGeneration } from './pages/ModelGeneration';
import MyModel from './components/MyModel';
import { ImageRecordsPage } from './components/ImageRecordsHistory';

// @ts-ignore
import LoginPage from './pages/LoginPage';
// @ts-ignore
import RegisterPage from './pages/RegisterPage';
// @ts-ignore
import AdminLayout from './layouts/AdminLayout';
// @ts-ignore
import Dashboard from './pages/admin/Dashboard';
// @ts-ignore
import AdminLogin from './pages/admin/Login';
// @ts-ignore
import UserList from './pages/admin/UserList';
// @ts-ignore
import AuditLogs from './pages/admin/AuditLogs';
// @ts-ignore
import PackageConfig from './pages/admin/membership/PackageConfig';
// @ts-ignore
import SubscriptionList from './pages/admin/membership/SubscriptionList';
// @ts-ignore
import RuleConfig from './pages/admin/points/RuleConfig';
// @ts-ignore
import PointsPackageConfig from './pages/admin/points/PointsPackageConfig';
// @ts-ignore
import Ledger from './pages/admin/points/Ledger';
// @ts-ignore
import OrderList from './pages/admin/order/OrderList';
// @ts-ignore
import NotificationConfig from './pages/admin/notification/NotificationConfig';
// @ts-ignore
import SendMessage from './pages/admin/notification/SendMessage';
// @ts-ignore
import SystemConfig from './pages/admin/config_center/SystemConfig';
// @ts-ignore
import ModelList from './pages/admin/yilaitumodel/ModelList';
// @ts-ignore
import ModelForm from './pages/admin/yilaitumodel/ModelForm';
// @ts-ignore
import FeedbackManagement from './pages/admin/feedback/FeedbackManagement';


import { AuthModal } from './components/AuthModal';

function App() {
  return (
    <BrowserRouter>
      <AuthModal />
      <Routes>
        {/* Public Routes - Homepage */}
        <Route path="/" element={
          <MainLayout>
            <ModelGeneration />
          </MainLayout>
        } />
        
        <Route path="/model-management" element={
          <MainLayout>
            <MyModel />
          </MainLayout>
        } />
        
        <Route path="/history" element={
          <MainLayout>
            <ImageRecordsPage />
          </MainLayout>
        } />
        
        {/* User Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        <Route path="/admin" element={<AdminLayout />}>
           <Route path="dashboard" element={<Dashboard />} />
           <Route path="users" element={<UserList />} />
           <Route path="logs" element={<AuditLogs />} />
           
           <Route path="membership/packages" element={<PackageConfig />} />
           <Route path="membership/subscriptions" element={<SubscriptionList />} />
           <Route path="points/rules" element={<RuleConfig />} />
           <Route path="points/packages" element={<PointsPackageConfig />} />
           <Route path="points/ledger" element={<Ledger />} />
           <Route path="orders" element={<OrderList />} />
           
           <Route path="notifications/config" element={<NotificationConfig />} />
           <Route path="notifications/send" element={<SendMessage />} />
           
           <Route path="config" element={<SystemConfig />} />
           
           {/* YiLaiTu Model Management */}
           <Route path="yilaitumodel/models" element={<ModelList />} />
           <Route path="yilaitumodel/models/new" element={<ModelForm />} />
           <Route path="yilaitumodel/models/:id/edit" element={<ModelForm />} />

           {/* Feedback Management */}
           <Route path="feedback" element={<FeedbackManagement />} />

           {/* Default redirect to dashboard */}
           <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
