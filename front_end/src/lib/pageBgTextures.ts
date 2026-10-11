/** Paper texture catalog — ref.background-types-1 */

export const PAGE_BG_TEXTURES = [
  { id: 'canson', label: 'Canson Paper (Coarse Grain)', index: 1 },
  { id: 'kraft', label: 'Raw Kraft Paper', index: 2 },
  { id: 'parchemin', label: 'Vegetable Parchment', index: 3 },
  { id: 'aquarelle', label: 'Absorbent Watercolor Paper', index: 4 },
  { id: 'journal', label: 'Recycled Newsprint', index: 5 },
  { id: 'lin', label: 'Fine Linen Canvas', index: 6 },
  { id: 'carton', label: 'Brown Cardboard', index: 7 },
  { id: 'soie', label: 'Crêpe Silk Paper', index: 8 },
  { id: 'grimoire', label: 'Aged Grimoire Parchment', index: 9 },
  { id: 'velours', label: 'Matte Velvet Paper', index: 10 },
  { id: 'washi', label: 'Artisan Japanese Washi', index: 11 },
  { id: 'cuir-graine', label: 'Leather Grain Paper', index: 12 },
  { id: 'calque', label: 'Frosted Tracing Paper', index: 13 },
  { id: 'carton-gris', label: 'Compact Grey Board', index: 14 },
  { id: 'buvard', label: 'Porous Blotting Paper', index: 15 },
  { id: 'cuir', label: 'Hide / Leather Parchment', index: 16 },
  { id: 'glace', label: 'Satin Glossy Paper', index: 17 },
  { id: 'riz', label: 'Flaky Rice Paper', index: 18 },
  { id: 'chanvre', label: 'Eco Hemp Fiber', index: 19 },
  { id: 'coton', label: 'Cotton Rag Paper', index: 20 },
  { id: 'bible', label: 'Thin Opaque Bible Paper', index: 21 },
  { id: 'carbone', label: 'Graphite Carbon Paper', index: 22 },
  { id: 'fiduciaire', label: 'Security Fiduciary Paper', index: 23 },
  { id: 'ingres', label: 'Laid Ingres Paper', index: 24 },
  { id: 'emeri', label: 'Flint / Emery Paper', index: 25 },
  { id: 'ecorce', label: 'Nepalese Bark Paper', index: 26 },
  { id: 'bristol', label: 'Smooth Matte Bristol', index: 27 },
  { id: 'rousseurs', label: 'Foxed Vintage Book', index: 28 },
  { id: 'papier-toile', label: 'Linen paper', index: 29 },
  { id: 'papier-artisanal-1', label: 'Artisanal Paper (1)', index: 30 },
  { id: 'sulfurise', label: 'Waxy Parchment Paper', index: 31 },
  { id: 'goudronne', label: 'Reinforced Tar Paper', index: 32 },
  { id: 'or', label: 'Crinkled Gold Leaf', index: 33 },
  { id: 'azure', label: 'Azure State Paper', index: 34 },
  { id: 'ardoise', label: 'Slate / Chalkboard Paper', index: 35 },
  { id: 'fantaisie', label: 'Fancy Pattern Paper', index: 36 },
  { id: 'canevas', label: 'Artist Canvas Texture', index: 37 },
  { id: 'papier-millimetre', label: 'Millimeter Grid Paper', index: 38 },
  { id: 'archivage', label: 'Fawn Archival Board', index: 39 },
  { id: 'suedine', label: 'Peach Suede Paper', index: 40 },
  { id: 'gros-grain', label: 'Coarse Grain Paper', index: 41 },
] as const

export type PageBgTextureId = (typeof PAGE_BG_TEXTURES)[number]['id']

export const PAGE_BG_TEXTURE_OPTIONS = PAGE_BG_TEXTURES.map((t) => ({
  value: t.id,
  label: `${t.index}. ${t.label}`,
}))

export function pageBgTextureClass(id: PageBgTextureId): string {
  return `theme-page-bg-texture--${id}`
}
