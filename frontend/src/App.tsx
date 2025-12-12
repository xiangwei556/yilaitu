import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Header from './components/Header';
import ImageEdit from './components/ImageEdit';
import PointsRecord from './components/PointsRecord';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <div className="app-container">
        <Header />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<ImageEdit />} />
            <Route path="/image-edit" element={<ImageEdit />} />
            <Route path="/points" element={<PointsRecord />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ConfigProvider>
  );
};

export default App;