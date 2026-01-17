import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import Home from './pages/Home';
import { ModelGeneration } from './pages/ModelGeneration';
import { ClothingColorChange } from './pages/ClothingColorChange';
import { ModelOutfitChanges } from './pages/ModelOutfitChanges';
import { FaceRetouchingNatural } from './pages/FaceRetouchingNatural';
import { PoseSplit } from './pages/PoseSplit';
import { BackgroundGeneration } from './pages/background_generation';
import { UniversalEdit } from './pages/UniversalEdit';
import { ImageExpansion } from './pages/ImageExpansion';
import { HdUpscale } from './pages/HdUpscale';
import { ChangeBackground } from './pages/ChangeBackground';
import MyModel from './pages/components/MyModel';
import { ImageRecordsPage } from './pages/components/ImageRecordsHistory';

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
// @ts-ignore
import WechatLoginPage from './pages/WechatLoginPage';

// System Images Management
// @ts-ignore
import CategoryList from './pages/admin/sys-images/CategoryList';
// @ts-ignore
import CategoryForm from './pages/admin/sys-images/CategoryForm';
// @ts-ignore
import ModelRefList from './pages/admin/sys-images/ModelRefList';
// @ts-ignore
import ModelRefForm from './pages/admin/sys-images/ModelRefForm';
// @ts-ignore
import SceneList from './pages/admin/sys-images/SceneList';
// @ts-ignore
import SceneForm from './pages/admin/sys-images/SceneForm';
// @ts-ignore
import PoseList from './pages/admin/sys-images/PoseList';
// @ts-ignore
import PoseForm from './pages/admin/sys-images/PoseForm';
// @ts-ignore
import BackgroundList from './pages/admin/sys-images/BackgroundList';
// @ts-ignore
import BackgroundForm from './pages/admin/sys-images/BackgroundForm';


import { AuthModal } from './pages/components/AuthModal';

function App() {
  return (
    <BrowserRouter>
      <AuthModal />
      <Routes>
        {/* Public Routes - Homepage */}
        <Route path="/" element={
          <MainLayout>
            <Home />
          </MainLayout>
        } />

        <Route path="/model-gen" element={
          <MainLayout>
            <ModelGeneration />
          </MainLayout>
        } />

        <Route path="/color-change" element={
          <MainLayout>
            <ClothingColorChange />
          </MainLayout>
        } />

        <Route path="/outfit-change" element={
          <MainLayout>
            <ModelOutfitChanges />
          </MainLayout>
        } />

        <Route path="/face-retouching" element={
          <MainLayout>
            <FaceRetouchingNatural />
          </MainLayout>
        } />
        
        <Route path="/pose-split" element={
          <MainLayout>
            <PoseSplit />
          </MainLayout>
        } />
        
        <Route path="/magic-edit" element={
          <MainLayout>
            <UniversalEdit />
          </MainLayout>
        } />
        
        <Route path="/expand" element={
          <MainLayout>
            <ImageExpansion />
          </MainLayout>
        } />
        
        <Route path="/clarify" element={
          <MainLayout>
            <HdUpscale />
          </MainLayout>
        } />
        
        <Route path="/white-bg" element={
          <MainLayout>
            <BackgroundGeneration />
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
        
        <Route path="/change-bg" element={
          <MainLayout>
            <ChangeBackground />
          </MainLayout>
        } />
        
        {/* User Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/wechat-login" element={<WechatLoginPage />} />
        
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

           {/* System Images Management */}
           <Route path="sys-images/categories" element={<CategoryList />} />
           <Route path="sys-images/categories/new" element={<CategoryForm />} />
           <Route path="sys-images/categories/:id/edit" element={<CategoryForm />} />
           <Route path="sys-images/model-refs" element={<ModelRefList />} />
           <Route path="sys-images/model-refs/new" element={<ModelRefForm />} />
           <Route path="sys-images/model-refs/:id/edit" element={<ModelRefForm />} />
           <Route path="sys-images/scenes" element={<SceneList />} />
           <Route path="sys-images/scenes/new" element={<SceneForm />} />
           <Route path="sys-images/scenes/:id/edit" element={<SceneForm />} />
           <Route path="sys-images/poses" element={<PoseList />} />
           <Route path="sys-images/poses/new" element={<PoseForm />} />
           <Route path="sys-images/poses/:id/edit" element={<PoseForm />} />
           <Route path="sys-images/backgrounds" element={<BackgroundList />} />
           <Route path="sys-images/backgrounds/new" element={<BackgroundForm />} />
           <Route path="sys-images/backgrounds/:id/edit" element={<BackgroundForm />} />

           {/* Default redirect to dashboard */}
           <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
