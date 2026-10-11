import {
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  Check,
  Code2,
  CreditCard,
  FileText,
  Filter,
  Globe,
  Home,
  Image,
  Layers,
  Lock,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Minus,
  Monitor,
  Newspaper,
  PackageCheck,
  PenLine,
  Play,
  Quote,
  Route,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  User,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export type WireframeIconId =
  | 'sparkles'
  | 'bot'
  | 'shield'
  | 'layers'
  | 'route'
  | 'users'
  | 'file-text'
  | 'code'
  | 'pen'
  | 'search'
  | 'mail'
  | 'calendar'
  | 'chart'
  | 'star'
  | 'quote'
  | 'globe'
  | 'lock'
  | 'credit-card'
  | 'image'
  | 'monitor'
  | 'play'
  | 'menu'
  | 'home'
  | 'briefcase'
  | 'check'
  | 'minus'
  | 'message'
  | 'package'
  | 'workflow'
  | 'building'
  | 'newspaper'
  | 'book'
  | 'filter'
  | 'bag'
  | 'pin'
  | 'user'

export const WIREFRAME_ICON_MAP: Record<WireframeIconId, LucideIcon> = {
  sparkles: Sparkles,
  bot: Bot,
  shield: Shield,
  layers: Layers,
  route: Route,
  users: Users,
  'file-text': FileText,
  code: Code2,
  pen: PenLine,
  search: Search,
  mail: Mail,
  calendar: Calendar,
  chart: BarChart3,
  star: Star,
  quote: Quote,
  globe: Globe,
  lock: Lock,
  'credit-card': CreditCard,
  image: Image,
  monitor: Monitor,
  play: Play,
  menu: Menu,
  home: Home,
  briefcase: Briefcase,
  check: Check,
  minus: Minus,
  message: MessageSquare,
  package: PackageCheck,
  workflow: Workflow,
  building: Building2,
  newspaper: Newspaper,
  book: BookOpen,
  filter: Filter,
  bag: ShoppingBag,
  pin: MapPin,
  user: User,
}
