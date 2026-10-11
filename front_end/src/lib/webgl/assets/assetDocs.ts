import { parseAssetAnnotationDoc, type AssetAnnotationDoc } from './assetAnnotations'
import builtinBox from './annotations/builtin-box.json'
import creationOfAdam from './annotations/the-creation-of-adam.json'
import aboutUsLetters from './annotations/about-us-letters.json'
import projectsLetters from './annotations/projects-letters.json'
import grasLetters from './annotations/gras-letters.json'
import darwinsMonkey from './annotations/darwins-monkey.json'
import statueOfAnOwl from './annotations/statue-of-an-owl.json'
import statueOfLiberty from './annotations/statue-of-liberty.json'
import stoneLantern from './annotations/stone-lantern.json'
import fortMason from './annotations/fort-mason.json'
import volumetricCloud from './annotations/volumetric-cloud.json'

const RAW_DOCS: Record<string, unknown> = {
  'builtin-box': builtinBox,
  'the-creation-of-adam': creationOfAdam,
  'about-us-letters': aboutUsLetters,
  'projects-letters': projectsLetters,
  'gras-letters': grasLetters,
  'darwins-monkey': darwinsMonkey,
  'statue-of-an-owl': statueOfAnOwl,
  'statue-of-liberty': statueOfLiberty,
  'stone-lantern': stoneLantern,
  'fort-mason': fortMason,
  'volumetric-cloud': volumetricCloud,
}

export function bakedAnnotationDoc(assetId: string): AssetAnnotationDoc | { error: string } {
  const raw = RAW_DOCS[assetId]
  if (raw === undefined) return { error: `no baked annotations for ${assetId}` }
  return parseAssetAnnotationDoc(raw)
}

export function bakedAssetIds(): string[] {
  return Object.keys(RAW_DOCS)
}
