import React, { useState } from 'react';
import { Logo } from './Logo';
import { useAuthStore } from '../stores/useAuthStore';
import { MembershipModal } from './MembershipModal';
import OrdersModal from './OrdersModal';
import PointsModal from './PointsModal';
import { UserOutlined } from '@ant-design/icons';
import { Star, ShoppingBag, FileText, Shield, Settings, LogOut, ChevronRight } from 'lucide-react';

export const Header: React.FC = () => {
  const { openAuthModal, isLoggedIn, user, logout } = useAuthStore();
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'membership' | 'points'>('membership');

  const openMembershipModal = (tab: 'membership' | 'points' = 'membership') => {
    setDefaultTab(tab);
    setMembershipModalOpen(true);
  };

  return (
    <>
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full border border-[#4C3BFF] flex items-center justify-center text-[#4C3BFF]">
                  <Star className="w-3 h-3 fill-current" />
                </div>
                <span className="font-bold text-[#4C3BFF] text-base">{user.points} 积分</span>
              </div>
              
              <button 
                onClick={() => openMembershipModal('membership')}
                className="bg-[#4C3BFF] text-white px-5 py-1.5 rounded-full text-sm font-medium hover:bg-[#3b2de0] transition-colors shadow-sm shadow-blue-500/20"
              >
                开通会员
              </button>

              <div className="relative" onMouseEnter={() => setShowUserPopover(true)} onMouseLeave={() => setShowUserPopover(false)}>
                <div className="flex items-center gap-2 cursor-pointer py-1">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100">
                    <img src="/touxiang.svg" alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-gray-600 text-sm font-medium hover:text-gray-900">我的账户</span>
                </div>

                {/* User Popover */}
                {showUserPopover && (
                  <div className="absolute right-0 top-full pt-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="w-[320px] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden pb-2">
                      {/* Popover Header */}
                      <div className="p-5 pb-4">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 shrink-0">
                             <img src="/touxiang.svg" alt="Avatar" className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="font-bold text-gray-900 text-lg leading-tight truncate">{user.nickname}</div>
                             <div className="text-xs text-gray-400 mt-0.5">ID: {user.id}</div>
                           </div>
                        </div>
                        
                        {/* Blue Card */}
                        <div className="bg-[#4C3BFF] rounded-xl p-4 text-white shadow-lg shadow-blue-500/30">
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-sm font-medium opacity-90">开通会员享受更多功能</span>
                            <button 
                              onClick={() => openMembershipModal('membership')}
                              className="bg-white text-[#4C3BFF] text-xs font-bold px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
                            >
                              开通会员
                            </button>
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-xs opacity-70 mb-0.5">当前积分</div>
                              <div className="text-3xl font-bold leading-none">{user.points}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <button 
                                onClick={() => setPointsModalOpen(true)}
                                className="flex items-center gap-0.5 text-xs opacity-80 hover:opacity-100 transition-opacity"
                              >
                                积分明细 <ChevronRight className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => openMembershipModal('points')}
                                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs px-3 py-1 rounded-full hover:bg-white/30 transition-colors"
                              >
                                购买积分包
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="px-2">
                        {[
                          { icon: ShoppingBag, label: '我的订单', action: () => setOrdersModalOpen(true) },
                          { icon: FileText, label: '用户协议' },
                          { icon: Shield, label: '隐私协议' },
                          { icon: Settings, label: '账户设置' }
                        ].map((item) => (
                          <button 
                            key={item.label}
                            onClick={item.action}
                            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors group w-full text-left"
                          >
                            <item.icon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="px-6 py-2 mt-1 border-t border-gray-50">
                        <button 
                          onClick={logout}
                          className="flex items-center gap-2 text-sm text-[#FF4D4F] hover:text-[#ff7875] transition-colors w-full py-2 font-medium"
                        >
                          <LogOut className="w-4 h-4" />
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
      
      <MembershipModal 
        isOpen={membershipModalOpen} 
        onClose={() => setMembershipModalOpen(false)} 
        defaultTab={defaultTab}
      />
      <OrdersModal 
        isOpen={ordersModalOpen} 
        onClose={() => setOrdersModalOpen(false)} 
      />
      <PointsModal 
        isOpen={pointsModalOpen} 
        onClose={() => setPointsModalOpen(false)} 
      />
    </>
  );
};
