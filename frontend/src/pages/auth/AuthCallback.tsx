import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const role = params.get('role');
    const error = params.get('error');

    if (error) {
      navigate('/login?error=oauth_failed');
      return;
    }

    if (token) {
      localStorage.setItem('accessToken', token);
      if (role === 'merchant') navigate('/dashboard/merchant');
      else if (role === 'admin') navigate('/admin');
      else if (role === 'driver') navigate('/dashboard/delivery');
      else navigate('/marketplace');
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500">Connexion en cours...</p>
    </div>
  );
}
