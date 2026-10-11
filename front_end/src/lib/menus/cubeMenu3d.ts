import {
  CSS_SHAPE3D_MENU_CUBE_REF_FACES,
  type CssShape3dMenuCubeRefFaceId,
} from '../shape3d/cssShape3dMenuCube'
import type { LucideIcon } from 'lucide-react'
import {
  Asterisk,
  AtSign,
  Beer,
  BookOpen,
  ChevronLeft,
  Code2,
  Gift,
  Home,
  LayoutGrid,
  MessageCircle,
  Palette,
  Plane,
  Rocket,
  Smartphone,
  User,
  Users,
  Wallet,
} from 'lucide-react'

export const CUBE_MENU3D_FACE_IDS = CSS_SHAPE3D_MENU_CUBE_REF_FACES

export type CubeMenu3dFaceId = CssShape3dMenuCubeRefFaceId

export type CubeMenu3dItemKind = 'spacer' | 'back' | 'header' | 'link' | 'note'

export type CubeMenu3dItem = {
  id: string
  kind: CubeMenu3dItemKind
  label?: string
  icon?: LucideIcon
  navigateTo?: CubeMenu3dFaceId
  url?: string
  gridRow: number
  gridColumn: number
  cellMod?: 'logo' | 'wide' | 'banner'
}

export const CUBE_MENU3D_FACES: Record<CubeMenu3dFaceId, readonly CubeMenu3dItem[]> = {
  home: [
    { id: 'home-corner', kind: 'spacer', gridRow: 1, gridColumn: 1 },
    { id: 'home-header', kind: 'header', icon: Home, label: 'Home', gridRow: 1, gridColumn: 2, cellMod: 'banner' },
    { id: 'home-about', kind: 'link', icon: User, label: 'About us', navigateTo: 'about', gridRow: 2, gridColumn: 1 },
    { id: 'home-shop', kind: 'link', icon: Wallet, label: 'Store', navigateTo: 'shop', gridRow: 2, gridColumn: 2 },
    { id: 'home-social', kind: 'link', icon: MessageCircle, label: 'Social', navigateTo: 'social', gridRow: 2, gridColumn: 3 },
    { id: 'home-misc', kind: 'link', icon: Asterisk, label: 'Projects', navigateTo: 'misc', gridRow: 3, gridColumn: 1 },
  ],
  shop: [
    { id: 'shop-back', kind: 'back', icon: ChevronLeft, label: 'Back', navigateTo: 'home', gridRow: 1, gridColumn: 1 },
    { id: 'shop-header', kind: 'header', icon: Wallet, label: 'Store', gridRow: 1, gridColumn: 2, cellMod: 'banner' },
    { id: 'shop-planes', kind: 'link', icon: Plane, label: 'Planes', gridRow: 2, gridColumn: 1 },
    { id: 'shop-rockets', kind: 'link', icon: Rocket, label: 'Rockets', gridRow: 2, gridColumn: 2 },
    { id: 'shop-gifts', kind: 'link', icon: Gift, label: 'Gifts', gridRow: 2, gridColumn: 3 },
    { id: 'shop-beer', kind: 'link', icon: Beer, label: 'Beer', gridRow: 3, gridColumn: 1 },
    { id: 'shop-mobiles', kind: 'link', icon: Smartphone, label: 'Mobiles', gridRow: 3, gridColumn: 2 },
    { id: 'shop-team', kind: 'link', icon: Users, label: 'Team', gridRow: 3, gridColumn: 3 },
  ],
  misc: [
    { id: 'misc-back', kind: 'back', icon: ChevronLeft, label: 'Back', navigateTo: 'home', gridRow: 1, gridColumn: 1 },
    { id: 'misc-header', kind: 'header', icon: Asterisk, label: 'Projects', gridRow: 1, gridColumn: 2, cellMod: 'banner' },
    {
      id: 'misc-patternwall',
      kind: 'link',
      icon: LayoutGrid,
      label: 'Patternwall',
      url: 'patternwall.net',
      gridRow: 2,
      gridColumn: 1,
    },
  ],
  about: [
    { id: 'about-back', kind: 'back', icon: ChevronLeft, label: 'Back', navigateTo: 'home', gridRow: 1, gridColumn: 1 },
    { id: 'about-header', kind: 'header', icon: User, label: 'About', gridRow: 1, gridColumn: 2, cellMod: 'banner' },
    { id: 'about-history', kind: 'link', icon: BookOpen, label: 'History', gridRow: 2, gridColumn: 1 },
    { id: 'about-team', kind: 'link', icon: Users, label: 'Our team', gridRow: 2, gridColumn: 2 },
  ],
  dribbble: [
    { id: 'dribbble-back', kind: 'back', icon: ChevronLeft, label: 'Back', navigateTo: 'social', gridRow: 1, gridColumn: 1 },
    { id: 'dribbble-header', kind: 'header', icon: Palette, label: 'Dribbble', gridRow: 1, gridColumn: 2, cellMod: 'banner' },
    { id: 'dribbble-logo', kind: 'link', icon: Palette, label: 'Profile', url: 'dribbble.com', gridRow: 2, gridColumn: 2, cellMod: 'logo' },
    {
      id: 'dribbble-note',
      kind: 'note',
      label: 'Join Dribbble — invite welcome.',
      url: 'dribbble.com',
      gridRow: 3,
      gridColumn: 1,
      cellMod: 'wide',
    },
  ],
  social: [
    { id: 'social-back', kind: 'back', icon: ChevronLeft, label: 'Back', navigateTo: 'home', gridRow: 1, gridColumn: 1 },
    { id: 'social-header', kind: 'header', icon: MessageCircle, label: 'Social', gridRow: 1, gridColumn: 2, cellMod: 'banner' },
    { id: 'social-github', kind: 'link', icon: Code2, label: 'Github', url: 'github.com', gridRow: 2, gridColumn: 1 },
    { id: 'social-twitter', kind: 'link', icon: AtSign, label: 'Twitter', url: 'twitter.com', gridRow: 2, gridColumn: 2 },
    { id: 'social-dribbble', kind: 'link', icon: Palette, label: 'Dribbble', navigateTo: 'dribbble', gridRow: 2, gridColumn: 3 },
    { id: 'social-xing', kind: 'link', icon: Users, label: 'XING', url: 'xing.com', gridRow: 3, gridColumn: 1 },
  ],
}

export function cubeMenu3dFaceRowCount(faceId: CubeMenu3dFaceId): number {
  return Math.max(...CUBE_MENU3D_FACES[faceId].map((item) => item.gridRow), 3)
}

export function cubeMenu3dCellClass(item: CubeMenu3dItem): string {
  return [
    'theme-cube-menu-3d__cell',
    `theme-cube-menu-3d__cell--${item.kind}`,
    `theme-cube-menu-3d__cell--r${item.gridRow}c${item.gridColumn}`,
    item.kind === 'note' ? 'theme-cube-menu-3d__cell--note' : '',
    item.cellMod === 'wide' ? 'theme-cube-menu-3d__cell--wide' : '',
    item.cellMod === 'logo' ? 'theme-cube-menu-3d__cell--logo' : '',
    item.cellMod === 'banner' ? 'theme-cube-menu-3d__cell--banner' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
