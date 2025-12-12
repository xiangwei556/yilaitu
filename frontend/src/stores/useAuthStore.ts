import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  nickname: string;
  avatar: string;
  points: number;
}

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updatePoints: (points: number) => void;
}

const initialUser = {
  id: 1,
  nickname: '测试用户',
  avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  points: 1250
};

// 使用localStorage持久化存储
const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: true,
      user: initialUser,
      token: 'dummy-token-123456',
      
      login: (userData, token) => {
        set(() => ({
          isLoggedIn: true,
          user: userData,
          token
        }));
      },
      
      logout: () => {
        set(() => ({
          isLoggedIn: false,
          user: null,
          token: null
        }));
      },
      
      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null
        }));
      },
      
      updatePoints: (points) => {
        set((state) => ({
          user: state.user ? { ...state.user, points } : null
        }));
      }
    }),
    {
      name: 'auth-storage', // localStorage key
      getStorage: () => localStorage
    }
  )
);

export default useAuthStore;