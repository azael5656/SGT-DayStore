import { FormEvent, useState } from 'react';
import { Activity, LogIn, Lock, Mail, Package, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

const FEATURES = [
  { Icon: Package, t: 'Inventario y stock al día' },
  { Icon: ShoppingBag, t: 'Ventas, fiados y reportes' },
  { Icon: Activity, t: 'Sensores del local en vivo' },
];

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

  const inputCls =
    'w-full bg-bg border border-border rounded-xl pl-9 pr-3 py-2.5 text-text ' +
    'placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  return (
    <div className="min-h-screen flex bg-bg text-text font-body">
      {/* Hero de marca (solo desktop) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between p-12 bg-surface border-r border-border">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <span className="font-heading font-extrabold text-xl">Dayisaacstore</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-heading text-4xl lg:text-5xl font-extrabold leading-[1.1]">
            Tu tienda anime, <span className="text-accent">bajo control</span>.
          </h1>
          <p className="text-text-muted mt-4 text-lg">
            Inventario, ventas, deudas y los sensores del local — todo en un panel.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map(({ Icon, t }) => (
              <li key={t} className="flex items-center gap-3 text-sm">
                <span className="h-9 w-9 rounded-xl bg-surface-alt grid place-items-center text-accent shrink-0">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="text-text">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-text-muted">San Cristóbal, Táchira · Venezuela</div>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-3 mb-8 justify-center">
            <Logo size={40} />
            <span className="font-heading font-extrabold text-xl">Dayisaacstore</span>
          </div>

          <h2 className="font-heading text-2xl font-extrabold">Inicia sesión</h2>
          <p className="text-sm text-text-muted mt-1 mb-6">Entra al panel de tu tienda</p>

          {error && (
            <div className="mb-4">
              <Alert tone="danger" title="No se pudo entrar">{error}</Alert>
            </div>
          )}

          <label className="block text-sm font-medium mb-1">Email</label>
          <div className="relative mb-4">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              autoFocus
              required
            />
          </div>

          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <div className="relative mb-6">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={cargando}
            className="w-full"
            leftIcon={cargando ? undefined : <LogIn size={16} />}>
            {cargando ? 'Entrando…' : 'Entrar'}
          </Button>

          <details className="mt-6 text-xs text-text-muted">
            <summary className="cursor-pointer hover:text-text">Cuentas demo</summary>
            <ul className="mt-2 space-y-1 pl-4">
              <li><code className="text-text">super@daystore.local</code> / super1234 (super admin)</li>
              <li><code className="text-text">owner@daystore.local</code> / 123456 (admin)</li>
              <li><code className="text-text">vendedor@daystore.local</code> / 123456 (vendedor)</li>
            </ul>
          </details>
        </form>
      </div>
    </div>
  );
}
