/** Semantic color tokens — family × light/dark (optional Ember red↔navy swap). */

import { GRASS_FLAME_FROM_REFS } from './grassFlamePalette'

export type ThemePalette = {
  name: string
  pageBg: string
  surface: string
  surfaceRaised: string
  surfaceInset: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  accent: string
  accentText: string
  focus: string
  /** Outline for accent-tinted callouts. */
  accentBorder: string
  /**
   * Secondary highlight — outlines, glow mid, warning.
   * Brand fills stay on `accent`.
   */
  complement: string
  complementBg: string
  complementBorder: string
  success: string
  successBg: string
  successBorder: string
  error: string
  errorBg: string
  errorBorder: string
  warning: string
  warningBg: string
  warningBorder: string
  info: string
  infoBg: string
  infoBorder: string
  shadowOuter: string
  shadowInner: string
  shadowHighlight: string
  shadowBrutal: string
  glowBorderRest: string
  glowBorderFrom: string
  glowBorderMid: string
  glowShadow: string
  glowInkFrom: string
  glowInkMid: string
  glowInkShadow: string
  /**
   * Product / WebGL scene accents (optional). Grass sets bright yellow, amber, and burnt orange
   * for hover dynamics and scene materials — flare/scatter in GL may read hotter than these tokens.
   */
  sceneYellowBright?: string
  sceneYellow?: string
  sceneOrange?: string
}

/** Palette families shown in Theme → Colors. */
export const THEME_PALETTE_FAMILIES = ['brand', 'eugenia', 'ember', 'grass'] as const
export type ThemePaletteFamily = (typeof THEME_PALETTE_FAMILIES)[number]
export type ThemePaletteMode = 'light' | 'dark'

/**
 * GRAS product dark — pitch black shell · flame gold from Creation-of-Adam refs.
 * Scene tokens feed WebGL UI; bands from [grassFlamePalette](./grassFlamePalette.ts).
 */
const GRASS_YELLOW_BRIGHT = GRASS_FLAME_FROM_REFS.bright
const GRASS_YELLOW = GRASS_FLAME_FROM_REFS.gold
const GRASS_ORANGE = GRASS_FLAME_FROM_REFS.dirty
const GRASS_TEXT = '#F5F2E8'
const GRASS_SPARK = GRASS_FLAME_FROM_REFS.cyan

/**
 * Ember print refs (CMYK → sRGB) — identity hues, not raw dumps on page chrome:
 * - Main `#D60036` — C0 M100 Y75 K16 → accent fills
 * - Complement `#000831` — C100 M92 Y52 K60 → text / outlines / dark shell
 * - Page `#F2AD78` — C5 M32 Y53 K0 → warm tint only (light mixes for page/surfaces)
 */
const EMBER_MAIN = '#D60036'
const EMBER_NAVY = '#000831'
const EMBER_PAGE_INK = '#F2AD78'
/** ~12% peach in white — readable field, not a solid apricot slab. */
const EMBER_PAGE_BG = '#FDF5EF'
const EMBER_SURFACE = '#FEFAF7'
const EMBER_SURFACE_RAISED = '#FFFFFF'
const EMBER_SURFACE_INSET = '#FCEFE4'
const EMBER_TEXT_MUTED = '#55424A'
const EMBER_DARK_PAGE = '#00072A'
const EMBER_DARK_SURFACE = '#141C41'
const EMBER_DARK_RAISED = '#1F264A'
const EMBER_DARK_INSET = '#000520'
const EMBER_MAIN_LIFT = '#DB1F4E'
const EMBER_PAGE_MUTED = '#B68466'
const EMBER_NAVY_LIFT = '#3D4A7A'

function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const colorPalettes = {
  /**
   * Brand light — white · indigo fills · amber highlights.
   */
  brand: {
    name: 'Brand',
    pageBg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceInset: '#F3F3F5',
    border: 'rgba(18, 16, 40, 0.48)',
    borderStrong: '#121028',
    text: '#121028',
    textMuted: '#5C5A6E',
    accent: '#3B39F0',
    accentText: '#FFFFFF',
    focus: '#3B39F0',
    accentBorder: 'rgba(59, 57, 240, 0.35)',
    complement: '#9E5F18',
    complementBg: 'rgba(158, 95, 24, 0.09)',
    complementBorder: 'rgba(158, 95, 24, 0.28)',
    success: '#38785A',
    successBg: 'rgba(56, 120, 90, 0.09)',
    successBorder: 'rgba(56, 120, 90, 0.2)',
    error: '#973856',
    errorBg: 'rgba(151, 56, 86, 0.09)',
    errorBorder: 'rgba(151, 56, 86, 0.2)',
    warning: '#9E5F18',
    warningBg: 'rgba(158, 95, 24, 0.09)',
    warningBorder: 'rgba(158, 95, 24, 0.28)',
    info: '#3B39F0',
    infoBg: 'rgba(59, 57, 240, 0.07)',
    infoBorder: 'rgba(59, 57, 240, 0.2)',
    shadowOuter: 'rgba(18, 16, 40, 0.12)',
    shadowInner: 'rgba(18, 16, 40, 0.08)',
    shadowHighlight: 'rgba(255, 255, 255, 0.92)',
    shadowBrutal: '#121028',
    glowBorderRest: 'rgba(18, 16, 40, 0.14)',
    glowBorderFrom: '#3B39F0',
    glowBorderMid: '#9E5F18',
    glowShadow: 'rgba(59, 57, 240, 0.28)',
    glowInkFrom: '#3B39F0',
    glowInkMid: '#9E5F18',
    glowInkShadow: 'rgba(158, 95, 24, 0.28)',
  },
  /** Brand dark — indigo fills · amber highlights on cool ink. */
  brandDark: {
    name: 'Brand · dark',
    pageBg: '#0E0D18',
    surface: '#161524',
    surfaceRaised: '#1E1C30',
    surfaceInset: '#0A0912',
    border: 'rgba(250, 250, 247, 0.48)',
    borderStrong: '#FAFAF7',
    text: '#FAFAF7',
    textMuted: 'rgba(250, 250, 247, 0.62)',
    accent: '#6462FF',
    accentText: '#0E0D18',
    focus: '#6462FF',
    accentBorder: 'rgba(100, 98, 255, 0.4)',
    complement: '#E0A04A',
    complementBg: 'rgba(224, 160, 74, 0.14)',
    complementBorder: 'rgba(224, 160, 74, 0.38)',
    success: '#5AAD89',
    successBg: 'rgba(90, 173, 137, 0.14)',
    successBorder: 'rgba(90, 173, 137, 0.38)',
    error: '#D4899A',
    errorBg: 'rgba(212, 137, 154, 0.14)',
    errorBorder: 'rgba(212, 137, 154, 0.38)',
    warning: '#E0A04A',
    warningBg: 'rgba(224, 160, 74, 0.14)',
    warningBorder: 'rgba(224, 160, 74, 0.38)',
    info: '#6462FF',
    infoBg: 'rgba(100, 98, 255, 0.14)',
    infoBorder: 'rgba(100, 98, 255, 0.38)',
    shadowOuter: 'rgba(0, 0, 0, 0.55)',
    shadowInner: 'rgba(0, 0, 0, 0.6)',
    shadowHighlight: 'rgba(255, 255, 255, 0.05)',
    shadowBrutal: '#05040A',
    glowBorderRest: 'rgba(250, 250, 247, 0.14)',
    glowBorderFrom: '#6462FF',
    glowBorderMid: '#E0A04A',
    glowShadow: 'rgba(100, 98, 255, 0.32)',
    glowInkFrom: '#6462FF',
    glowInkMid: '#E0A04A',
    glowInkShadow: 'rgba(224, 160, 74, 0.35)',
  },
  /**
   * Eugenia light — white · process blue fills · Eugenia red highlights.
   * Blue CMYK 100/73/43/10 → `#003E83` · Eugenia red CMYK 7/76/60/0 → `#ED3D66`.
   */
  eugenia: {
    name: 'Eugenia',
    pageBg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceInset: '#F2F4F8',
    border: 'rgba(0, 34, 72, 0.48)',
    borderStrong: '#001F42',
    text: '#001F42',
    textMuted: '#4A5B70',
    accent: '#003E83',
    accentText: '#FFFFFF',
    focus: '#003E83',
    accentBorder: 'rgba(0, 62, 131, 0.35)',
    complement: '#ED3D66',
    complementBg: 'rgba(237, 61, 102, 0.09)',
    complementBorder: 'rgba(237, 61, 102, 0.28)',
    success: '#38785A',
    successBg: 'rgba(56, 120, 90, 0.09)',
    successBorder: 'rgba(56, 120, 90, 0.2)',
    error: '#ED3D66',
    errorBg: 'rgba(237, 61, 102, 0.09)',
    errorBorder: 'rgba(237, 61, 102, 0.22)',
    warning: '#C45A2A',
    warningBg: 'rgba(196, 90, 42, 0.09)',
    warningBorder: 'rgba(196, 90, 42, 0.28)',
    info: '#003E83',
    infoBg: 'rgba(0, 62, 131, 0.07)',
    infoBorder: 'rgba(0, 62, 131, 0.2)',
    shadowOuter: 'rgba(0, 34, 72, 0.12)',
    shadowInner: 'rgba(0, 34, 72, 0.08)',
    shadowHighlight: 'rgba(255, 255, 255, 0.92)',
    shadowBrutal: '#001F42',
    glowBorderRest: 'rgba(0, 34, 72, 0.14)',
    glowBorderFrom: '#003E83',
    glowBorderMid: '#ED3D66',
    glowShadow: 'rgba(0, 62, 131, 0.28)',
    glowInkFrom: '#003E83',
    glowInkMid: '#ED3D66',
    glowInkShadow: 'rgba(237, 61, 102, 0.28)',
  },
  /** Eugenia dark — lifted blue fills · soft red highlights on deep ink. */
  eugeniaDark: {
    name: 'Eugenia · dark',
    pageBg: '#061018',
    surface: '#0C1A28',
    surfaceRaised: '#132536',
    surfaceInset: '#040B12',
    border: 'rgba(232, 240, 248, 0.48)',
    borderStrong: '#E8F0F8',
    text: '#E8F0F8',
    textMuted: 'rgba(232, 240, 248, 0.62)',
    accent: '#4A8FD4',
    accentText: '#061018',
    focus: '#4A8FD4',
    accentBorder: 'rgba(74, 143, 212, 0.4)',
    complement: '#FF6B8A',
    complementBg: 'rgba(255, 107, 138, 0.14)',
    complementBorder: 'rgba(255, 107, 138, 0.38)',
    success: '#5AAD89',
    successBg: 'rgba(90, 173, 137, 0.14)',
    successBorder: 'rgba(90, 173, 137, 0.38)',
    error: '#FF6B8A',
    errorBg: 'rgba(255, 107, 138, 0.14)',
    errorBorder: 'rgba(255, 107, 138, 0.38)',
    warning: '#E0A04A',
    warningBg: 'rgba(224, 160, 74, 0.14)',
    warningBorder: 'rgba(224, 160, 74, 0.38)',
    info: '#4A8FD4',
    infoBg: 'rgba(74, 143, 212, 0.14)',
    infoBorder: 'rgba(74, 143, 212, 0.38)',
    shadowOuter: 'rgba(0, 0, 0, 0.55)',
    shadowInner: 'rgba(0, 0, 0, 0.6)',
    shadowHighlight: 'rgba(255, 255, 255, 0.05)',
    shadowBrutal: '#02060A',
    glowBorderRest: 'rgba(232, 240, 248, 0.14)',
    glowBorderFrom: '#4A8FD4',
    glowBorderMid: '#FF6B8A',
    glowShadow: 'rgba(74, 143, 212, 0.32)',
    glowInkFrom: '#4A8FD4',
    glowInkMid: '#FF6B8A',
    glowInkShadow: 'rgba(255, 107, 138, 0.35)',
  },
  /**
   * Ember light (crimson lead) — cream wash · crimson fills · navy complement / text.
   */
  ember: {
    name: 'Ember',
    pageBg: EMBER_PAGE_BG,
    surface: EMBER_SURFACE,
    surfaceRaised: EMBER_SURFACE_RAISED,
    surfaceInset: EMBER_SURFACE_INSET,
    border: rgba(EMBER_NAVY, 0.48),
    borderStrong: EMBER_NAVY,
    text: EMBER_NAVY,
    textMuted: EMBER_TEXT_MUTED,
    accent: EMBER_MAIN,
    accentText: '#FFFFFF',
    focus: EMBER_MAIN,
    accentBorder: rgba(EMBER_MAIN, 0.32),
    complement: EMBER_NAVY,
    complementBg: rgba(EMBER_NAVY, 0.06),
    complementBorder: rgba(EMBER_NAVY, 0.24),
    success: '#2F6B4A',
    successBg: 'rgba(47, 107, 74, 0.09)',
    successBorder: 'rgba(47, 107, 74, 0.2)',
    error: EMBER_MAIN,
    errorBg: rgba(EMBER_MAIN, 0.08),
    errorBorder: rgba(EMBER_MAIN, 0.24),
    warning: '#B85A1A',
    warningBg: rgba(EMBER_PAGE_INK, 0.18),
    warningBorder: rgba(EMBER_PAGE_INK, 0.45),
    info: EMBER_NAVY,
    infoBg: rgba(EMBER_NAVY, 0.06),
    infoBorder: rgba(EMBER_NAVY, 0.2),
    shadowOuter: rgba(EMBER_NAVY, 0.1),
    shadowInner: rgba(EMBER_NAVY, 0.08),
    shadowHighlight: 'rgba(255, 255, 255, 0.9)',
    shadowBrutal: EMBER_NAVY,
    glowBorderRest: rgba(EMBER_NAVY, 0.12),
    glowBorderFrom: EMBER_MAIN,
    glowBorderMid: EMBER_PAGE_INK,
    glowShadow: rgba(EMBER_MAIN, 0.26),
    glowInkFrom: EMBER_MAIN,
    glowInkMid: EMBER_PAGE_INK,
    glowInkShadow: rgba(EMBER_PAGE_INK, 0.32),
  },
  /**
   * Ember swap light (navy lead) — cream wash · navy fills · crimson complement.
   */
  emberSwap: {
    name: 'Ember · navy',
    pageBg: EMBER_PAGE_BG,
    surface: EMBER_SURFACE,
    surfaceRaised: EMBER_SURFACE_RAISED,
    surfaceInset: EMBER_SURFACE_INSET,
    border: rgba(EMBER_NAVY, 0.48),
    borderStrong: EMBER_NAVY,
    text: EMBER_NAVY,
    textMuted: EMBER_TEXT_MUTED,
    accent: EMBER_NAVY,
    accentText: '#FFFFFF',
    focus: EMBER_NAVY,
    accentBorder: rgba(EMBER_NAVY, 0.32),
    complement: EMBER_MAIN,
    complementBg: rgba(EMBER_MAIN, 0.07),
    complementBorder: rgba(EMBER_MAIN, 0.26),
    success: '#2F6B4A',
    successBg: 'rgba(47, 107, 74, 0.09)',
    successBorder: 'rgba(47, 107, 74, 0.2)',
    error: EMBER_MAIN,
    errorBg: rgba(EMBER_MAIN, 0.08),
    errorBorder: rgba(EMBER_MAIN, 0.24),
    warning: EMBER_MAIN,
    warningBg: rgba(EMBER_MAIN, 0.08),
    warningBorder: rgba(EMBER_MAIN, 0.26),
    info: EMBER_NAVY,
    infoBg: rgba(EMBER_NAVY, 0.06),
    infoBorder: rgba(EMBER_NAVY, 0.2),
    shadowOuter: rgba(EMBER_NAVY, 0.1),
    shadowInner: rgba(EMBER_NAVY, 0.08),
    shadowHighlight: 'rgba(255, 255, 255, 0.9)',
    shadowBrutal: EMBER_NAVY,
    glowBorderRest: rgba(EMBER_NAVY, 0.12),
    glowBorderFrom: EMBER_NAVY,
    glowBorderMid: EMBER_MAIN,
    glowShadow: rgba(EMBER_NAVY, 0.28),
    glowInkFrom: EMBER_NAVY,
    glowInkMid: EMBER_MAIN,
    glowInkShadow: rgba(EMBER_MAIN, 0.28),
  },
  /**
   * Ember dark (crimson lead) — navy shell · lifted crimson · peach complement.
   */
  emberDark: {
    name: 'Ember · dark',
    pageBg: EMBER_DARK_PAGE,
    surface: EMBER_DARK_SURFACE,
    surfaceRaised: EMBER_DARK_RAISED,
    surfaceInset: EMBER_DARK_INSET,
    border: 'rgba(247, 237, 228, 0.48)',
    borderStrong: '#F7EDE4',
    text: '#F7EDE4',
    textMuted: 'rgba(247, 237, 228, 0.62)',
    accent: EMBER_MAIN_LIFT,
    accentText: '#FFFFFF',
    focus: EMBER_MAIN_LIFT,
    accentBorder: rgba(EMBER_MAIN_LIFT, 0.4),
    complement: EMBER_PAGE_MUTED,
    complementBg: rgba(EMBER_PAGE_INK, 0.1),
    complementBorder: rgba(EMBER_PAGE_INK, 0.32),
    success: '#5AAD89',
    successBg: 'rgba(90, 173, 137, 0.14)',
    successBorder: 'rgba(90, 173, 137, 0.38)',
    error: EMBER_MAIN_LIFT,
    errorBg: rgba(EMBER_MAIN_LIFT, 0.14),
    errorBorder: rgba(EMBER_MAIN_LIFT, 0.38),
    warning: EMBER_PAGE_MUTED,
    warningBg: rgba(EMBER_PAGE_INK, 0.1),
    warningBorder: rgba(EMBER_PAGE_INK, 0.32),
    info: EMBER_NAVY_LIFT,
    infoBg: rgba(EMBER_NAVY_LIFT, 0.16),
    infoBorder: rgba(EMBER_NAVY_LIFT, 0.35),
    shadowOuter: 'rgba(0, 0, 0, 0.55)',
    shadowInner: 'rgba(0, 0, 0, 0.6)',
    shadowHighlight: 'rgba(255, 255, 255, 0.05)',
    shadowBrutal: '#000410',
    glowBorderRest: 'rgba(247, 237, 228, 0.12)',
    glowBorderFrom: EMBER_MAIN_LIFT,
    glowBorderMid: EMBER_PAGE_MUTED,
    glowShadow: rgba(EMBER_MAIN_LIFT, 0.3),
    glowInkFrom: EMBER_MAIN_LIFT,
    glowInkMid: EMBER_PAGE_MUTED,
    glowInkShadow: rgba(EMBER_PAGE_MUTED, 0.32),
  },
  /**
   * Ember swap dark — lifted navy fills · crimson spark · muted peach glow.
   */
  emberSwapDark: {
    name: 'Ember · navy dark',
    pageBg: EMBER_DARK_PAGE,
    surface: EMBER_DARK_SURFACE,
    surfaceRaised: EMBER_DARK_RAISED,
    surfaceInset: EMBER_DARK_INSET,
    border: 'rgba(247, 237, 228, 0.48)',
    borderStrong: '#F7EDE4',
    text: '#F7EDE4',
    textMuted: 'rgba(247, 237, 228, 0.62)',
    accent: EMBER_NAVY_LIFT,
    accentText: '#FFFFFF',
    focus: EMBER_NAVY_LIFT,
    accentBorder: rgba(EMBER_NAVY_LIFT, 0.4),
    complement: EMBER_MAIN_LIFT,
    complementBg: rgba(EMBER_MAIN_LIFT, 0.12),
    complementBorder: rgba(EMBER_MAIN_LIFT, 0.35),
    success: '#5AAD89',
    successBg: 'rgba(90, 173, 137, 0.14)',
    successBorder: 'rgba(90, 173, 137, 0.38)',
    error: EMBER_MAIN_LIFT,
    errorBg: rgba(EMBER_MAIN_LIFT, 0.14),
    errorBorder: rgba(EMBER_MAIN_LIFT, 0.38),
    warning: EMBER_PAGE_MUTED,
    warningBg: rgba(EMBER_PAGE_INK, 0.1),
    warningBorder: rgba(EMBER_PAGE_INK, 0.32),
    info: EMBER_NAVY_LIFT,
    infoBg: rgba(EMBER_NAVY_LIFT, 0.16),
    infoBorder: rgba(EMBER_NAVY_LIFT, 0.35),
    shadowOuter: 'rgba(0, 0, 0, 0.55)',
    shadowInner: 'rgba(0, 0, 0, 0.6)',
    shadowHighlight: 'rgba(255, 255, 255, 0.05)',
    shadowBrutal: '#000410',
    glowBorderRest: 'rgba(247, 237, 228, 0.12)',
    glowBorderFrom: EMBER_NAVY_LIFT,
    glowBorderMid: EMBER_MAIN_LIFT,
    glowShadow: rgba(EMBER_NAVY_LIFT, 0.3),
    glowInkFrom: EMBER_NAVY_LIFT,
    glowInkMid: EMBER_MAIN_LIFT,
    glowInkShadow: rgba(EMBER_MAIN_LIFT, 0.32),
  },
  /**
   * Grass — near-black product shell · bright yellow fills · amber complement.
   * Same hue set as grassDark; slightly lifted surfaces for light-mode toggle.
   */
  grass: {
    name: 'Grass',
    pageBg: '#080808',
    surface: '#101010',
    surfaceRaised: '#181818',
    surfaceInset: '#050505',
    border: 'rgba(245, 242, 232, 0.42)',
    borderStrong: GRASS_TEXT,
    text: GRASS_TEXT,
    textMuted: 'rgba(245, 242, 232, 0.62)',
    accent: GRASS_YELLOW_BRIGHT,
    accentText: '#080808',
    focus: GRASS_YELLOW_BRIGHT,
    accentBorder: rgba(GRASS_YELLOW_BRIGHT, 0.42),
    complement: GRASS_YELLOW,
    complementBg: rgba(GRASS_YELLOW, 0.14),
    complementBorder: rgba(GRASS_YELLOW, 0.38),
    success: '#5AAD89',
    successBg: 'rgba(90, 173, 137, 0.14)',
    successBorder: 'rgba(90, 173, 137, 0.38)',
    error: '#E07070',
    errorBg: 'rgba(224, 112, 112, 0.14)',
    errorBorder: 'rgba(224, 112, 112, 0.38)',
    warning: GRASS_ORANGE,
    warningBg: rgba(GRASS_ORANGE, 0.14),
    warningBorder: rgba(GRASS_ORANGE, 0.38),
    info: GRASS_SPARK,
    infoBg: rgba(GRASS_SPARK, 0.12),
    infoBorder: rgba(GRASS_SPARK, 0.35),
    shadowOuter: 'rgba(0, 0, 0, 0.65)',
    shadowInner: 'rgba(0, 0, 0, 0.7)',
    shadowHighlight: 'rgba(255, 255, 255, 0.04)',
    shadowBrutal: '#000000',
    glowBorderRest: 'rgba(245, 242, 232, 0.12)',
    glowBorderFrom: GRASS_YELLOW_BRIGHT,
    glowBorderMid: GRASS_YELLOW,
    glowShadow: rgba(GRASS_YELLOW_BRIGHT, 0.32),
    glowInkFrom: GRASS_YELLOW_BRIGHT,
    glowInkMid: GRASS_ORANGE,
    glowInkShadow: rgba(GRASS_ORANGE, 0.35),
    sceneYellowBright: GRASS_YELLOW_BRIGHT,
    sceneYellow: GRASS_YELLOW,
    sceneOrange: GRASS_ORANGE,
  },
  /**
   * Grass dark — pitch black · bright yellow · amber · burnt orange scene accents.
   */
  grassDark: {
    name: 'Grass · dark',
    pageBg: '#000000',
    surface: '#0A0A0A',
    surfaceRaised: '#141414',
    surfaceInset: '#050505',
    border: 'rgba(245, 242, 232, 0.48)',
    borderStrong: GRASS_TEXT,
    text: GRASS_TEXT,
    textMuted: 'rgba(245, 242, 232, 0.62)',
    accent: GRASS_YELLOW_BRIGHT,
    accentText: '#000000',
    focus: GRASS_YELLOW_BRIGHT,
    accentBorder: rgba(GRASS_YELLOW_BRIGHT, 0.45),
    complement: GRASS_YELLOW,
    complementBg: rgba(GRASS_YELLOW, 0.16),
    complementBorder: rgba(GRASS_YELLOW, 0.4),
    success: '#5AAD89',
    successBg: 'rgba(90, 173, 137, 0.14)',
    successBorder: 'rgba(90, 173, 137, 0.38)',
    error: '#E07070',
    errorBg: 'rgba(224, 112, 112, 0.14)',
    errorBorder: 'rgba(224, 112, 112, 0.38)',
    warning: GRASS_ORANGE,
    warningBg: rgba(GRASS_ORANGE, 0.16),
    warningBorder: rgba(GRASS_ORANGE, 0.4),
    info: GRASS_SPARK,
    infoBg: rgba(GRASS_SPARK, 0.12),
    infoBorder: rgba(GRASS_SPARK, 0.35),
    shadowOuter: 'rgba(0, 0, 0, 0.7)',
    shadowInner: 'rgba(0, 0, 0, 0.75)',
    shadowHighlight: 'rgba(255, 255, 255, 0.04)',
    shadowBrutal: '#000000',
    glowBorderRest: 'rgba(245, 242, 232, 0.12)',
    glowBorderFrom: GRASS_YELLOW_BRIGHT,
    glowBorderMid: GRASS_YELLOW,
    glowShadow: rgba(GRASS_YELLOW_BRIGHT, 0.35),
    glowInkFrom: GRASS_YELLOW_BRIGHT,
    glowInkMid: GRASS_ORANGE,
    glowInkShadow: rgba(GRASS_ORANGE, 0.38),
    sceneYellowBright: GRASS_YELLOW_BRIGHT,
    sceneYellow: GRASS_YELLOW,
    sceneOrange: GRASS_ORANGE,
  },
} as const satisfies Record<string, ThemePalette>

export type ThemePaletteId = keyof typeof colorPalettes

export const DEFAULT_PALETTE_ID: ThemePaletteId = 'brand'

export const THEME_PALETTE_STORAGE_KEY = 'theme_palette'

const FAMILY_IDS: Record<
  ThemePaletteFamily,
  { light: ThemePaletteId; dark: ThemePaletteId; swapLight?: ThemePaletteId; swapDark?: ThemePaletteId }
> = {
  brand: { light: 'brand', dark: 'brandDark' },
  eugenia: { light: 'eugenia', dark: 'eugeniaDark' },
  ember: {
    light: 'ember',
    dark: 'emberDark',
    swapLight: 'emberSwap',
    swapDark: 'emberSwapDark',
  },
  grass: { light: 'grass', dark: 'grassDark' },
}

export function normalizePaletteId(stored: string | null | undefined): ThemePaletteId {
  if (!stored) return DEFAULT_PALETTE_ID
  if (stored === 'light') return 'brand'
  if (stored === 'dark') return 'brandDark'
  if (stored in colorPalettes) return stored as ThemePaletteId
  return DEFAULT_PALETTE_ID
}

export function themePaletteFamily(id: ThemePaletteId): ThemePaletteFamily {
  if (id === 'brand' || id === 'brandDark') return 'brand'
  if (id === 'eugenia' || id === 'eugeniaDark') return 'eugenia'
  if (id === 'grass' || id === 'grassDark') return 'grass'
  return 'ember'
}

export function themePaletteMode(id: ThemePaletteId): ThemePaletteMode {
  return id === 'brandDark' || id.endsWith('Dark') ? 'dark' : 'light'
}

export function isDarkPalette(id: string): boolean {
  return themePaletteMode(normalizePaletteId(id)) === 'dark'
}

export function themePaletteIsSwap(id: ThemePaletteId): boolean {
  return id === 'emberSwap' || id === 'emberSwapDark'
}

export function resolveThemePaletteId(
  family: ThemePaletteFamily,
  mode: ThemePaletteMode,
  swap = false,
): ThemePaletteId {
  const entry = FAMILY_IDS[family]
  if (family === 'ember' && swap) {
    return mode === 'dark' ? (entry.swapDark as ThemePaletteId) : (entry.swapLight as ThemePaletteId)
  }
  return mode === 'dark' ? entry.dark : entry.light
}

export function withThemePaletteMode(id: ThemePaletteId, mode: ThemePaletteMode): ThemePaletteId {
  return resolveThemePaletteId(themePaletteFamily(id), mode, themePaletteIsSwap(id))
}

export function withThemePaletteSwap(id: ThemePaletteId, swap: boolean): ThemePaletteId {
  return resolveThemePaletteId(themePaletteFamily(id), themePaletteMode(id), swap)
}

export function toggleThemePaletteMode(id: ThemePaletteId): ThemePaletteId {
  return withThemePaletteMode(id, themePaletteMode(id) === 'light' ? 'dark' : 'light')
}
