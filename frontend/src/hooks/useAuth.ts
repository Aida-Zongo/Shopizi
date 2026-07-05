import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export function useAuthCheck() {
  const { setAuth, logout, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          useAuthStore.setState({
            user: response.data.data,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      } catch (error) {
        logout();
        navigate('/login');
      }
    };

    checkAuth();
  }, [setAuth, logout, navigate]);
}
