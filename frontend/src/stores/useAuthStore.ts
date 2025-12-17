import { create } from 'zustand';

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
  login: (userData?: { nickname: string; id: string; points: number; avatar: string; }) => void;
  logout: () => void;
}

// 从localStorage读取登录状态
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
  ...loadAuthState(), // 初始化时从localStorage加载状态
  openAuthModal: () => set({ isOpen: true }),
  closeAuthModal: () => set({ isOpen: false }),
  login: (userData) => {
    const user = userData || {
      nickname: '188****8888',
      id: '12345678',
      points: 30,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
    };
    
    // 保存到localStorage
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(user));
    
    set({ 
      isLoggedIn: true, 
      user,
      isOpen: false
    });
  },
  logout: () => {
    // 清除localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    
    set({ isLoggedIn: false, user: null });
  },
}));
