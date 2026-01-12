import React from 'react';
import { Sidebar } from '../pages/components/Sidebar';
import { Header } from '../pages/components/Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="h-screen bg-[#F7F8FA] font-sans text-gray-800 overflow-hidden flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 pl-[200px] h-full">
          {children}
        </main>
      </div>
    </div>
  );
};
