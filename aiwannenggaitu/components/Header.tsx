
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-30 relative flex-shrink-0">
      <div className="flex items-center space-x-2">
        <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">衣来图</h1>
      </div>
      
      <div className="flex items-center space-x-4 text-sm font-medium text-gray-600 dark:text-gray-300">
        <div className="flex items-center space-x-6 mr-2">
          <a className="hover:text-primary transition-colors" href="#">联系客服</a>
          <a className="hover:text-primary transition-colors" href="#">帮助中心</a>
        </div>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
        
        <div className="flex items-center bg-primary/5 dark:bg-primary/20 rounded-full pl-5 pr-1 py-1 border border-primary/10 dark:border-primary/30 ml-3">
          <div className="flex items-center mr-3 gap-1.5">
            <span className="material-symbols-outlined text-[20px] text-yellow-500">monetization_on</span>
            <div className="flex flex-col items-start leading-none justify-center">
              <span className="text-[10px] text-primary/70 font-medium mb-0.5">积分</span>
              <span className="text-sm font-bold text-primary">1,250</span>
            </div>
          </div>
          <button className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-full shadow-md hover:bg-primary/90 transition-all flex items-center">
            <span className="material-symbols-outlined text-sm mr-1">diamond</span>
            开通会员
          </button>
        </div>
        
        <div className="ml-3">
          <div className="w-9 h-9 rounded-full ring-2 ring-gray-100 dark:ring-gray-700 overflow-hidden">
            <img alt="User" className="w-full h-full object-cover" src="https://picsum.photos/100/100?random=1"/>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
