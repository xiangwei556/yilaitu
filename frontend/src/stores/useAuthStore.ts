import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
  isAuthModalOpen: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      isLoggedIn: !!localStorage.getItem('token'),
      user: JSON.parse(localStorage.getItem('user') || 'null'),
      token: localStorage.getItem('token'),
      isAuthModalOpen: false,

      login: (token, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ isLoggedIn: true, user, token });
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ isLoggedIn: false, user: null, token: null });
      },

      openAuthModal: () => set({ isAuthModalOpen: true }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),
    })
  )
);