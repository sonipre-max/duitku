// Pusat ikon aplikasi.
// - Ikon fungsional/navigasi: Lucide (konsisten stroke, modern).
// - Ikon dekoratif/ilustratif: Iconify (emoji/koleksi kaya, karakter).
import {
  Home, Wallet, ListTodo, LineChart, Sparkles, Settings, NotebookPen, X,
  Plus, Minus, Pencil, CalendarDays, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Star, Eye, EyeOff, ArrowRight,
} from 'lucide-react';
import { Icon } from '@iconify/react';

// ── Lucide (fungsional) ──
export const Ic = {
  home: Home,
  wallet: Wallet,
  todo: ListTodo,
  invest: LineChart,
  ai: Sparkles,
  settings: Settings,
  note: NotebookPen,
  x: X,
  plus: Plus,
  minus: Minus,
  pencil: Pencil,
  calendar: CalendarDays,
  chevLeft: ChevronLeft,
  chevRight: ChevronRight,
  up: TrendingUp,
  down: TrendingDown,
  star: Star,
  eye: Eye,
  eyeOff: EyeOff,
  arrow: ArrowRight,
};

// ── Iconify (dekoratif/karakter) ──
export const Deco = {
  avatar: (props: any) => <Icon icon="fluent-emoji:boy" {...props} />,
  crown: (props: any) => <Icon icon="fluent-emoji:crown" {...props} />,
  sun: (props: any) => <Icon icon="fluent-emoji:sun" {...props} />,
  moon: (props: any) => <Icon icon="fluent-emoji:crescent-moon" {...props} />,
  sunCloud: (props: any) => <Icon icon="fluent-emoji:sun-behind-cloud" {...props} />,
  cloud: (props: any) => <Icon icon="fluent-emoji:cloud" {...props} />,
  pin: (props: any) => <Icon icon="fluent-emoji:round-pushpin" {...props} />,
  compass: (props: any) => <Icon icon="fluent-emoji:compass" {...props} />,
  graduation: (props: any) => <Icon icon="fluent-emoji:graduation-cap" {...props} />,
  book: (props: any) => <Icon icon="fluent-emoji:open-book" {...props} />,
  gym: (props: any) => <Icon icon="fluent-emoji:person-lifting-weights" {...props} />,
  laptop: (props: any) => <Icon icon="fluent-emoji:laptop" {...props} />,
  lotus: (props: any) => <Icon icon="fluent-emoji:lotus" {...props} />,
  cart: (props: any) => <Icon icon="fluent-emoji:shopping-cart" {...props} />,
  memo: (props: any) => <Icon icon="fluent-emoji:memo" {...props} />,
};
