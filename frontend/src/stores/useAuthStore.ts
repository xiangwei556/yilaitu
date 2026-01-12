import { create } from 'zustand';
import { webSocketService } from '../services/WebSocketService';
import request from '../utils/request';

interface AuthStore {
  isOpen: boolean;
  isLoggedIn: boolean;
  user: {
    nickname: string;
    id: string;
    points: number;
    avatar: string;
  } | null;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (userData?: { nickname: string; id: string; points: number; avatar: string; }, closeModal?: boolean) => void;
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
    
    const user = userData;
    
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
          const updatedUser = {
            ...state.user,
            nickname: userData.nickname,
            avatar: userData.avatar,
            points: userData.points
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
