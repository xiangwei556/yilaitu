import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './Logo';
import { useAuthStore } from '../stores/useAuthStore';
import { MembershipModal } from './MembershipModal';
import OrdersModal from './OrdersModal';
import PointsModal from './PointsModal';
import { UserOutlined } from '@ant-design/icons';
import { Star, ShoppingBag, FileText, Shield, Settings, LogOut, ChevronRight, Bell, BellOff } from 'lucide-react';
import { webSocketService } from '../services/WebSocketService';
import { MessageCenter } from './MessageCenter';
import { getUnreadCount, getMyMessages, Message, markMessageRead } from '../api/message';
import { Spin, Empty } from 'antd';
import dayjs from 'dayjs';


export const Header: React.FC = () => {
  const { openAuthModal, isLoggedIn, user, logout } = useAuthStore();
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [messageCenterOpen, setMessageCenterOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'membership' | 'points'>('membership');
  const [unreadCount, setUnreadCount] = useState(0);
  const [hoveredMessages, setHoveredMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showMessagePreview, setShowMessagePreview] = useState(false);
  const [detailMessage, setDetailMessage] = useState<Message | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [messagePreviewTimer, setMessagePreviewTimer] = useState<NodeJS.Timeout | null>(null);

  const userIdRef = useRef<number | null>(null);

  const fetchUnread = async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.count);
    } catch (e) {
      console.error('Failed to fetch unread count:', e);
    }
  };

  useEffect(() => {
    if (isLoggedIn && user) {
      const currentUserId = Number(user.id);
      
      if (userIdRef.current !== currentUserId) {
        console.log('=== Connecting WebSocket for user ===', 'userId:', currentUserId);
        userIdRef.current = currentUserId;
        webSocketService.connect(currentUserId);
        fetchUnread();
      }
    } else {
      if (userIdRef.current !== null) {
        console.log('=== Disconnecting WebSocket (user logged out) ===');
        webSocketService.disconnect();
        userIdRef.current = null;
      }
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    const unsubscribe = webSocketService.addMessageHandler(() => {
      fetchUnread();
    });

    const handleNotificationClick = (event: CustomEvent) => {
      const { messageId } = event.detail;
      
      const fetchMessageAndOpenCenter = async () => {
        try {
          if (messageId) {
            const res = await getMyMessages({
              page: 1,
              page_size: 1,
              id: messageId
            });
            
            if (res.items && res.items.length > 0) {
              const message = res.items[0];
              setDetailMessage(message);
              setDetailOpen(true);
              setMessageCenterOpen(true);
            } else {
              setMessageCenterOpen(true);
            }
          } else {
            setMessageCenterOpen(true);
          }
        } catch (error) {
          console.error('Failed to handle notification click:', error);
          setMessageCenterOpen(true);
        }
      };
      
      fetchMessageAndOpenCenter();
    };
    
    document.addEventListener('notificationClick', handleNotificationClick as EventListener);

    return () => {
      console.log('=== Header message handlers cleanup ===');
      unsubscribe();
      document.removeEventListener('notificationClick', handleNotificationClick as EventListener);
    };
  }, [isLoggedIn]);

  const openMembershipModal = (tab: 'membership' | 'points' = 'membership') => {
    setDefaultTab(tab);
    setMembershipModalOpen(true);
  };

  const handleUnreadCountChange = async () => {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.count);
    } catch (e) {
      console.error(e);
    }
  };

  // 获取最近5条未读消息
  const fetchRecentMessages = async () => {
    if (!isLoggedIn || !user) return;
    setIsLoadingMessages(true);
    try {
      const res = await getMyMessages({
        page: 1,
        page_size: 5,
        status: 'unread'
      });
      setHoveredMessages(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // 时间格式化
  const getTimeAgo = (dateStr: string) => {
    const date = dayjs(dateStr);
    const now = dayjs();
    const diffHours = now.diff(date, 'hour');
    
    if (diffHours < 1) return `${now.diff(date, 'minute')}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffHours < 48) return '昨天';
    return date.format('YYYY-MM-DD');
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-30 relative flex-shrink-0">
        {/* Left Side: Logo */}
        <div className="flex items-center space-x-2">
          <Logo />
        </div>

        {/* Right Side: Navigation & Actions */}
        <div className="flex items-center space-x-4 text-sm font-medium text-gray-600 dark:text-gray-300">
          <div className="flex items-center space-x-6 mr-2">
            <a className="hover:text-brand-dark transition-colors" href="#">联系客服</a>
            <a className="hover:text-brand-dark transition-colors" href="#">帮助中心</a>
            <a className="hover:text-brand-dark transition-colors" href="#">小程序</a>
          </div>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>

          {isLoggedIn && user ? (
            <>
              {/* Message Notification */}
              <div className="relative group ml-2">
                <div 
                  className="relative cursor-pointer group"
                  onMouseEnter={() => {
                    // Clear any existing timer when mouse enters the icon
                    if (messagePreviewTimer) {
                      clearTimeout(messagePreviewTimer);
                      setMessagePreviewTimer(null);
                    }
                    setShowUserPopover(false);
                    setShowMessagePreview(true);
                    fetchRecentMessages();
                  }}
                  onMouseLeave={() => {
                    // Set a timer to hide the popover after a short delay
                    const timer = setTimeout(() => {
                      setShowMessagePreview(false);
                      setMessagePreviewTimer(null);
                    }, 300);
                    setMessagePreviewTimer(timer);
                  }}
                >
                  <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">notifications</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"></span>
                    )}
                  </div>
                </div>
                
                {/* Popover for Messages - Custom Implementation similar to User Popover */}
                {showMessagePreview && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-200 transform origin-top-right z-50 animate-in fade-in slide-in-from-top-2"
                    onMouseEnter={() => {
                      // Clear the timer when mouse enters the popover
                      if (messagePreviewTimer) {
                        clearTimeout(messagePreviewTimer);
                        setMessagePreviewTimer(null);
                      }
                    }}
                    onMouseLeave={() => {
                      // Hide the popover immediately when mouse leaves
                      setShowMessagePreview(false);
                    }}
                  >
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800 rounded-t-xl">
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        消息中心
                        {unreadCount > 0 && <span className="bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full border border-red-100">{unreadCount}条未读</span>}
                      </h3>
                      
                    </div>
                    <ul className="max-h-[400px] overflow-y-auto py-1">
                      {hoveredMessages.length > 0 ? (
                        hoveredMessages.map((msg) => (
                          <li 
                            key={msg.id} 
                            className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-start space-x-3 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                            onClick={async () => {
                              // Mark as read if unread
                              if (msg.status === 'unread') {
                                try {
                                  await markMessageRead(msg.id);
                                  // Refresh messages and unread count
                                  handleUnreadCountChange();
                                  fetchRecentMessages();
                                } catch (error) {
                                  console.error('Failed to mark message as read:', error);
                                }
                              }
                                
                              setDetailMessage(msg);
                              setDetailOpen(true);
                              setMessageCenterOpen(true);
                            }}
                          >
                            {msg.status === 'unread' && <div className="h-2 w-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0"></div>}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{msg.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{msg.content}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{getTimeAgo(msg.created_at)}</p>
                            </div>
                          </li>
                        ))
                      ) : (
                        <li className="px-4 py-12 text-center">
                          <div className="flex-1">
                            <div className="flex justify-center mb-4">
                              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl text-gray-400 dark:text-gray-500">notifications_off</span>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">暂无未读消息</p>
                          </div>
                        </li>
                      )}
                    </ul>
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl text-center">
                      <a 
                        className="text-xs font-medium text-brand-dark hover:text-brand-dark/80 flex items-center justify-center group/more"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setMessageCenterOpen(true);
                        }}
                      >
                        查看更多
                        <span className="material-symbols-outlined text-sm ml-1 transform group-hover/more:translate-x-0.5 transition-transform">chevron_right</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center bg-brand-dark/5 dark:bg-brand-dark/20 rounded-full pl-5 pr-1 py-1 border border-brand-dark/10 dark:border-brand-dark/30 ml-3">
                <div className="flex items-center mr-3 gap-1.5 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setPointsModalOpen(true)}>
                  <span className="material-symbols-outlined text-[20px] text-yellow-500 drop-shadow-sm">monetization_on</span>
                  <div className="flex flex-col items-start leading-none justify-center">
                    <span className="text-[10px] text-brand-dark/70 dark:text-brand-dark/60 font-medium mb-0.5">我的积分</span>
                    <span className="text-sm font-bold text-brand-dark dark:text-brand-light">{(user.points || 0).toLocaleString()}</span>
                  </div>
                </div>
                <button 
                  onClick={() => openMembershipModal('membership')}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#3713ec] rounded-full shadow-md shadow-[#3713ec]/20 hover:bg-[#3713ec]/90 hover:shadow-[#3713ec]/30 transition-all duration-300 flex items-center"
                >
                  <span className="material-symbols-outlined text-sm mr-1">diamond</span>
                  开通会员
                </button>
              </div>

              <div className="ml-3 relative" onMouseEnter={() => setShowUserPopover(true)} onMouseLeave={() => setShowUserPopover(false)}>
                <button className="flex items-center justify-center w-9 h-9 rounded-full ring-2 ring-gray-100 dark:ring-gray-700 hover:ring-brand-dark/30 transition-all overflow-hidden focus:outline-none group">
                  <img alt="User Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" src="/touxiang.svg" />
                </button>

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
                        <div className="bg-[rgb(55_19_236/var(--tw-bg-opacity,1))] rounded-xl p-4 text-white shadow-lg shadow-[rgb(55_19_236/var(--tw-bg-opacity,0.3))]">
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-sm font-medium opacity-90">开通会员享受更多功能</span>
                            <button 
                              onClick={() => openMembershipModal('membership')}
                              className="bg-white text-[rgb(55_19_236/var(--tw-bg-opacity,1))] text-xs font-bold px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
                            >
                              开通会员
                            </button>
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-xs opacity-70 mb-0.5">当前积分</div>
                              <div className="text-3xl font-bold leading-none">{user.points || 0}</div>
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
                        <button 
                          onClick={() => { setMessageCenterOpen(true); setShowUserPopover(false); }}
                          className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors group w-full text-left"
                        >
                          <div className="relative">
                            <Bell className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            {unreadCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full px-0.5">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium">我的消息</span>
                        </button>
                        
                        {[
                          { icon: ShoppingBag, label: '我的订单', action: () => setOrdersModalOpen(true) },
                          { icon: FileText, label: '用户协议' },
                          { icon: Shield, label: '隐私协议' },
                          { icon: Settings, label: '账户设置' }
                        ].map((item) => (
                          <button 
                            key={item.label}
                            onClick={item.action || undefined}
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
            </>
          ) : (
            /* Login/Register Button */
            <button 
              onClick={openAuthModal}
              className="bg-[rgb(55_19_236/var(--tw-bg-opacity,1))] text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-[rgb(55_19_236/var(--tw-bg-opacity,0.9))] transition-colors shadow-sm shadow-[rgb(55_19_236/var(--tw-bg-opacity,0.3))] ml-2"
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
      <MessageCenter 
        open={messageCenterOpen}
        onClose={() => {
          setMessageCenterOpen(false);
          setDetailOpen(false);
          setDetailMessage(null);
        }}
        onUnreadCountChange={handleUnreadCountChange}
        initialDetailOpen={detailOpen}
        initialCurrentMessage={detailMessage}
        onOpenMessageCenter={() => {
          // Set messageCenterOpen to true to open the MessageCenter modal
          setMessageCenterOpen(true);
          // Set detailOpen to false to close the Detail modal
          setDetailOpen(false);
        }}
      />
    </>
  );
};
