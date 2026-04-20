import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('owner@daystore.local');
  const [password, setPassword] = useState('123456');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(msg || 'Credenciales invalidas');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🏪</span>
          <div>
            <h1 className="text-2xl font-bold">DayStore</h1>
            <p className="text-sm text-gray-500">Panel administrativo</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
          required
        />

        <label className="block text-sm font-medium mb-1">Contrasena</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-primary text-white rounded-md py-2.5 font-semibold hover:bg-primaryDark disabled:opacity-60 transition">
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>

        <details className="mt-6 text-xs text-gray-500">
          <summary className="cursor-pointer">Cuentas demo</summary>
          <ul className="mt-2 space-y-1 pl-4">
            <li><code>super@daystore.local</code> / super1234 (super admin)</li>
            <li><code>owner@daystore.local</code> / 123456 (admin)</li>
            <li><code>vendedor@daystore.local</code> / 123456 (vendedor)</li>
          </ul>
        </details>
      </form>
    </div>
  );
}
