import {
  Activity,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Banknote,
  BarChart3,
  BellRing,
  BookOpen,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock,
  CreditCard,
  DollarSign,
  DoorClosed,
  DoorOpen,
  Droplet,
  FileText,
  Flame,
  Gem,
  HandCoins,
  HelpCircle,
  Home,
  Lightbulb,
  LogOut,
  type LucideIcon,
  Package,
  Pencil,
  Plus,
  Receipt,
  ScrollText,
  Search,
  Shirt,
  ShoppingBag,
  Siren,
  Store,
  Thermometer,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  Vibrate,
  X,
  Zap,
} from 'lucide-react-native';
import { COLORS } from '../utils/constants';

/**
 * Iconos del sistema de diseño (Lucide). Reemplaza los emojis de la app.
 * Uso: <Icon name="ventas" color={COLORS.primary} size={22} />
 * Requiere react-native-svg (build nativo).
 */
const MAP: Record<string, LucideIcon> = {
  // Navegación / dominios
  home: Home,
  inventario: Package,
  alertas: BellRing,
  perfil: CircleUserRound,
  ventas: ShoppingBag,
  negocio: Store,
  reportes: BarChart3,
  auditoria: ScrollText,
  tendencias: TrendingUp,
  usuarios: Users,
  horario: Clock,
  tasas: DollarSign,
  cambio: ArrowLeftRight,
  clientes: HandCoins,
  recibo: Receipt,
  // Sensores IoT
  temperatura: Thermometer,
  humedad: Droplet,
  luz: Zap,
  corriente: Zap,
  buzzer: Siren,
  puerta: DoorOpen,
  'puerta-cerrada': DoorClosed,
  movimiento: Activity,
  vibracion: Vibrate,
  incendio: Flame,
  // Categorías de producto
  manga: BookOpen,
  figura: Trophy,
  camisa: Shirt,
  gorra: Shirt,
  joyeria: Gem,
  pedreria: Gem,
  // Acciones / UI
  agregar: Plus,
  editar: Pencil,
  borrar: Trash2,
  buscar: Search,
  check: Check,
  cerrar: X,
  salir: LogOut,
  pdf: FileText,
  tip: Lightbulb,
  credito: CreditCard,
  contado: Banknote,
  flecha: ChevronRight,
  'flecha-izq': ArrowLeft,
  'flecha-der': ArrowRight,
};

interface Props {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = 22, color = COLORS.text, strokeWidth = 1.75 }: Props) {
  const Cmp = MAP[name] ?? HelpCircle;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
