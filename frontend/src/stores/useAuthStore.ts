import { create } from 'zustand';
import { webSocketService } from '../services/WebSocketService';
import request from '../utils/request';

// 会员等级文案映射
const getMemberLevelText = (level: number): string => {
  const map: Record<number, string> = {
    0: '普通用户',
    1: '普通会员',
    2: '专业会员',
    3: '企业会员'
  };
  return map[level] || '普通用户';
};

// 计算会员是否过期
const checkMemberExpired = (expireTime: string | null): boolean => {
  if (!expireTime) return true;
  return new Date() > new Date(expireTime);
};

interface AuthStore {
  isOpen: boolean;
  isLoggedIn: boolean;
  user: {
    nickname: string;
    id: string;
    points: number;
    avatar: string;
    member_level: number;
    member_expire_time: string | null;
    is_member_expired: boolean;
    member_level_text: string;
  } | null;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (userData?: {
    nickname: string;
    id: string;
    points: number;
    avatar: string;
    member_level?: number;
    member_expire_time?: string | null;
  }, closeModal?: boolean) => void;
  logout: () => void;
  updatePoints: (points: number) => void;
  refreshUserInfo: () => Promise<void>;
}

const loadAuthState = () => {
  const savedIsLoggedIn = localStorage.getItem('isLoggedIn');
  const savedUser = localStorage.getItem('user');
  
  return {
    isLoggedIn: savedIsLoggedIn === 'true',
    user: savedUser ? JSON.parse(savedUser) : null
  };
};

export const useAuthStore = create<AuthStore>((set) => ({
  isOpen: false,
  ...loadAuthState(),
  openAuthModal: () => set({ isOpen: true }),
  closeAuthModal: () => set({ isOpen: false }),
  login: (userData, closeModal = true) => {
    if (!userData) return;

    const memberLevel = userData.member_level || 0;
    const memberExpireTime = userData.member_expire_time || null;

    const user = {
      ...userData,
      member_level: memberLevel,
      member_expire_time: memberExpireTime,
      is_member_expired: checkMemberExpired(memberExpireTime),
      member_level_text: getMemberLevelText(memberLevel)
    };

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(user));

    set({
      isLoggedIn: true,
      user,
      isOpen: !closeModal
    });
  },
  logout: () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    
    webSocketService.disconnect();
    
    set({ isLoggedIn: false, user: null });
  },
  updatePoints: (points: number) => {
    set((state) => {
      if (!state.user) return state;

      const updatedUser = { ...state.user, points };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return { user: updatedUser };
    });
  },
  refreshUserInfo: async () => {
    try {
      // request 拦截器已经返回 res.data，所以 response 直接就是数据对象
      const userData = await request.get('/user/info');
      if (userData) {
        set((state) => {
          if (!state.user) return state;
          const memberLevel = userData.member_level || 0;
          const memberExpireTime = userData.member_expire_time || null;
          const updatedUser = {
            ...state.user,
            nickname: userData.nickname,
            avatar: userData.avatar,
            points: userData.points,
            member_level: memberLevel,
            member_expire_time: memberExpireTime,
            is_member_expired: userData.is_member_expired ?? checkMemberExpired(memberExpireTime),
            member_level_text: userData.member_level_text || getMemberLevelText(memberLevel)
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          return { user: updatedUser };
        });
        console.log('用户信息刷新成功:', userData);
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  },
}));
