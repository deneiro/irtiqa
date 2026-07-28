import {
  BookOpen,
  Briefcase,
  Cake,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Eye,
  EyeOff,
  Flag,
  GripVertical,
  Handshake,
  Heart,
  Home,
  LayoutDashboard,
  Lock,
  type LucideProps,
  Music2,
  Pencil,
  PieChart,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Square,
  Star,
  Sun,
  Swords,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Wand2,
  X,
} from 'lucide-react';

export type IconName =
  // modules / nav
  | 'dashboard' | 'habits' | 'quests' | 'journal' | 'social' | 'finances' | 'market' | 'achievements' | 'settings' | 'calendar'
  // attributes
  | 'health' | 'friends' | 'family' | 'money' | 'career' | 'spirituality' | 'development' | 'brightness'
  // classes (the seven radicals)
  | 'bard' | 'warden' | 'sovereign' | 'healer' | 'magician' | 'herald' | 'sentinel'
  // actions / chrome
  | 'gold' | 'check' | 'close' | 'edit' | 'trash' | 'plus' | 'starFilled' | 'starOutline'
  | 'play' | 'stop' | 'flag' | 'lock' | 'trophy' | 'grip' | 'eye' | 'eyeOff'
  | 'cake' | 'target' | 'chevronLeft' | 'chevronRight' | 'chronicle' | 'wheel' | 'subscription';

const ICONS: Record<IconName, React.ComponentType<LucideProps>> = {
  // modules
  dashboard: LayoutDashboard,
  habits: Repeat,
  quests: Swords,
  journal: BookOpen,
  social: Users,
  finances: Wallet,
  market: ShoppingCart,
  achievements: Trophy,
  settings: Settings,
  calendar: Calendar,
  // attributes
  health: Heart,
  friends: Handshake,
  family: Home,
  money: Coins,
  career: Briefcase,
  spirituality: Sparkles,
  development: TrendingUp,
  brightness: Sun,
  // classes (the seven radicals)
  bard: Music2,
  warden: ShieldCheck,
  sovereign: Crown,
  healer: Heart,
  magician: Wand2,
  herald: Sun,
  sentinel: Eye,
  // actions / chrome
  gold: Coins,
  check: Check,
  close: X,
  edit: Pencil,
  trash: Trash2,
  plus: Plus,
  starFilled: Star,
  starOutline: Star,
  play: Play,
  stop: Square,
  flag: Flag,
  lock: Lock,
  trophy: Trophy,
  grip: GripVertical,
  chronicle: ScrollText,
  wheel: PieChart,
  eye: Eye,
  eyeOff: EyeOff,
  cake: Cake,
  target: Target,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  subscription: RefreshCw,
};

export function Icon({ name, size = 18, fill, ...props }: { name: IconName; size?: number } & LucideProps) {
  const Cmp = ICONS[name];
  const resolvedFill = fill ?? (name === 'starFilled' ? 'currentColor' : 'none');
  return <Cmp size={size} strokeWidth={1.8} fill={resolvedFill} aria-hidden="true" {...props} />;
}
