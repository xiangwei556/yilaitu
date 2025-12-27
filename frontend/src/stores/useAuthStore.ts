import { create } from 'zustand';
import { webSocketService } from '../services/WebSocketService';

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
  updatePoints: (points: number) => void;
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
  login: (userData) => {
    if (!userData) return;
    
    const user = userData;
    
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(user));
    
    set({ 
      isLoggedIn: true, 
      user,
      isOpen: false
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
}));
