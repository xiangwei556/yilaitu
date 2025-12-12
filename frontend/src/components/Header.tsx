import React, { useState } from 'react';
import { Logo } from './Logo';
import { useAuthStore } from '../stores/useAuthStore';

interface User {
  id: number;
  nickname: string;
  avatar: string;
  points: number;
}

export const Header: React.FC = () => {
  const { openAuthModal, isLoggedIn, user, logout } = useAuthStore();
  const [showUserPopover, setShowUserPopover] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 right-0 left-0 z-50">
      {/* Left Side: Logo */}
      <div className="flex items-center">
        <Logo />
      </div>

      {/* Right Side: Navigation & Actions */}
      <div className="flex items-center gap-6 text-sm text-gray-500 font-medium">
        <a href="#" className="hover:text-gray-900 transition-colors">联系客服</a>
        <a href="#" className="hover:text-gray-900 transition-colors">帮助中心</a>
        <a href="#" className="hover:text-gray-900 transition-colors">小程序</a>
        
        <div className="w-px h-4 bg-gray-200 mx-2" />

        {isLoggedIn && user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-full border border-gray-100 px-3 py-1 shadow-sm">
              <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-white text-xs font-bold">C</div>
              <span className="font-bold text-gray-900">{user.points}</span>
              <span className="text-gray-400 text-xs">积分记录</span>
            </div>
            
            <button className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/20">
              开通会员
            </button>

            <div className="relative" onMouseEnter={() => setShowUserPopover(true)} onMouseLeave={() => setShowUserPopover(false)}>
              <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden cursor-pointer border border-gray-100">
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>

              {/* User Popover */}
              {showUserPopover && (
                <div className="absolute right-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="w-[280px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Popover Header */}
                    <div className="p-4 border-b border-gray-50">
                      <div className="flex items-center gap-3 mb-3">
                         <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border border-gray-100">
                           <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                         </div>
                         <div>
                           <div className="font-bold text-gray-900 text-base">{user.nickname}</div>
                           <div className="text-xs text-gray-400">ID: {user.id}</div>
                         </div>
                      </div>
                       
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-white text-xs font-bold">C</div>
                          <span className="font-bold text-gray-900">{user.points} 积分</span>
                        </div>
                        <button className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/20 scale-90 origin-right">
                          开通会员
                        </button>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {['我的订单', '用户协议', '隐私协议', '账户设置'].map((item) => (
                        <a 
                          key={item}
                          href="#" 
                          className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                          {item}
                        </a>
                      ))}
                      <div className="h-px bg-gray-50 my-1" />
                      <button 
                        onClick={logout}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        退出登录
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Login/Register Button */
          <button 
            onClick={openAuthModal}
            className="bg-[#4C3BFF] text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-[#3b2de0] transition-colors shadow-sm shadow-blue-500/30"
          >
            登录/注册
          </button>
        )}
      </div>
    </header>
  );
};