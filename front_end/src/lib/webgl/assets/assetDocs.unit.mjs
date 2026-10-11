/**
 * Baked annotation docs match the asset registry.
 * Run: npx tsx front_end/src/lib/webgl/assets/assetDocs.unit.mjs
 */
import assert from 'node:assert/strict'
import { WEBGL_ASSETS } from './assetManifest.ts'
import { bakedAnnotationDoc, bakedAssetIds } from './assetDocs.ts'

for (const asset of WEBGL_ASSETS) {
  const doc = bakedAnnotationDoc(asset.id)
  assert.ok(!('error' in doc), `${asset.id} baked doc: ${'error' in doc ? doc.error : ''}`)
  if ('error' in doc) continue
  assert.equal(doc.assetId, asset.id)
  assert.equal(doc.units, asset.units)
  assert.equal(doc.upAxis, asset.upAxis)
}

const adam = bakedAnnotationDoc('the-creation-of-adam')
assert.ok(!('error' in adam))
if (!('error' in adam)) {
  assert.ok(adam.notes?.includes('glTF Binary'))
  assert.match(adam.notes ?? '', /back of scene/)
  const home = adam.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
  assert.ok(home, 'Adam must bake a Home viewpoint')
  assert.deepEqual(home?.position, [0, 0.5, 0], 'Home pin stays at the sculpture center')
  assert.deepEqual(home?.camera, [-0.5054449693328621, 0.20935624209362158, -0.10912691270966193])
  assert.deepEqual(home?.target, [0.07211756881207634, 0.3130456736689876, -0.00020925034262128808])
  assert.ok(home?.orbit, 'Home must store orbit heading relative to the model')
  assert.ok(
    (home?.camera?.[1] ?? 1) < 0.22,
    'negative: Home must be the closer session pose, not the wider back-of-scene y=0.25 framing',
  )
  const back = adam.annotations.find((mark) => mark.id === 'viewpoint-back-of-scene')
  assert.ok(back, 'Adam must bake a back-of-scene viewpoint')
  assert.equal(back?.kind, 'viewpoint')
  assert.equal(back?.label, 'back of scene')
  assert.deepEqual(back?.camera, [0.46060052924629785, 0.006298760296870376, 0.06340836206686079])
  assert.deepEqual(back?.target, [0.05028552835531321, 0.27856532646983845, 0.0024437998666976247])
  assert.equal(back?.orbit?.azimuth, 1.4232955175918045)
  assert.ok((home?.camera?.[0] ?? 0) * (back?.camera?.[0] ?? 0) < 0, 'back of scene is the other side of the sculpture')
  assert.notDeepEqual(
    back?.camera,
    [-0.5660976514074321, 0.25424870888960405, -0.12515496691836872],
    'negative: back of scene must not be the old same-heading zoom',
  )
  assert.notDeepEqual(
    back?.camera,
    [0.6496801069570147, 0.20935624209362158, 0.10870841202441944],
    'negative: back of scene must not be a made-up 180° flip of Home',
  )
  assert.equal(
    adam.annotations.some((mark) => mark.kind === 'point' && mark.label === 'main_hand_web'),
    true,
  )
  const tip = adam.annotations.find((mark) => mark.id === 'point-finger-tip')
  assert.ok(tip, 'Adam must bake the fingertip impulse mark')
  assert.equal(tip?.label, 'finger tip')
  assert.equal(tip?.impulse, true)
  assert.equal(tip?.objectName, 'Object_4')
  assert.deepEqual(tip?.position, [0.023671742398913356, 0.37372406410018266, -0.059935212423620654])
  assert.notEqual(tip?.objectName, 'Object_5', 'negative: the poke is the recaptured fingertip, not the old Object_5 mark')
}

const liberty = bakedAnnotationDoc('statue-of-liberty')
assert.ok(!('error' in liberty))
if (!('error' in liberty)) {
  assert.equal(liberty.assetId, 'statue-of-liberty')
  assert.match(liberty.notes ?? '', /ceramic/)
  assert.match(liberty.notes ?? '', /cage/)
  assert.notEqual(liberty.assetId, 'the-creation-of-adam', 'negative: Liberty must not reuse Adam annotations')
  const home = liberty.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
  assert.ok(home, 'Liberty must bake a Home viewpoint')
  assert.deepEqual(home?.camera, [0.461175686088034, 0.27613195277294944, -0.040229274207341154])
  assert.deepEqual(home?.target, [-0.06627943244351724, 0.748802608867931, 0.07678242631809161])
  assert.equal(home?.orbit?.azimuth, 1.7891029179277274)
  assert.ok(home?.orbit?.radius && home.orbit.radius < 0.9, 'negative: Liberty Home is the closer captured framing')
  const flame = liberty.annotations.find((mark) => mark.id === 'point-flame-top')
  assert.equal(flame?.label, 'flame top')
  assert.equal(flame?.impulse, true)
  assert.equal(flame?.objectName, 'Torch_Liberty_MAT_0')
  assert.deepEqual(flame?.position, [0.09238669730249267, 0.9051548073420193, 0.1534093240596558])
  const side = liberty.annotations.find((mark) => mark.id === 'point-side-profile')
  assert.equal(side?.label, 'side profile')
  assert.equal(side?.objectName, 'Statue_Liberty_MAT_0')
  assert.equal(side?.impulse, undefined, 'negative: the body profile is not the torch poke')
  const back = liberty.annotations.find((mark) => mark.id === 'point-back-profile')
  assert.equal(back?.label, 'back profile')
  assert.equal(back?.objectName, 'Statue_Liberty_MAT_0')
  assert.notEqual(flame?.objectName, 'Statue_Liberty_MAT_0', 'negative: the torch mark must not sit on the body mesh')
}

const owl = bakedAnnotationDoc('statue-of-an-owl')
assert.ok(!('error' in owl))
if (!('error' in owl)) {
  assert.equal(owl.assetId, 'statue-of-an-owl')
  assert.match(owl.notes ?? '', /ceramic/)
  assert.match(owl.notes ?? '', /cage/)
  assert.notEqual(owl.assetId, 'statue-of-liberty', 'negative: the owl must not reuse Liberty annotations')
  const home = owl.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
  assert.ok(home, 'Owl must bake a Home viewpoint')
  assert.deepEqual(home?.camera, [0.49931829332721644, 0.43782871957531, 1.4953581871696315])
  assert.deepEqual(home?.target, [0.1361769368019713, 0.7439689339856105, -0.08254764360960437])
  assert.equal(home?.orbit?.radius, 1.6478410986819363)
  assert.ok(home?.orbit?.radius && home.orbit.radius < 2, 'Owl Home is the copied closer framing')
  assert.notDeepEqual(home?.camera, [2.4, 1.6, 3.2], 'negative: Owl Home must not stay at the toolkit default')
  const owlBack = owl.annotations.find((mark) => mark.id === 'point-owl-back')
  assert.equal(owlBack?.label, 'owl back')
  assert.equal(owlBack?.kind, 'point')
  assert.equal(owlBack?.objectName, 'Object_2')
  assert.deepEqual(owlBack?.position, [-0.14357058721848387, 1.2581720471783737, -0.13917638568678203])
  const owlWing = owl.annotations.find((mark) => mark.id === 'point-owl-wing-tip')
  assert.equal(owlWing?.label, 'owl wing tip')
  assert.equal(owlWing?.kind, 'point')
  assert.equal(owlWing?.objectName, 'Object_2')
  assert.deepEqual(owlWing?.position, [0.2848335277682722, 1.1836090710599918, 0.04105958945399113])
  assert.notEqual(owlBack?.id, owlWing?.id, 'negative: back and wing tip are two marks')
  assert.equal(owlBack?.impulse, undefined, 'negative: owl back is inspect only')
  assert.equal(owlWing?.impulse, true)
  assert.notEqual(owlBack?.impulse, true, 'negative: the poke is the wing, not the back')
}

const monkey = bakedAnnotationDoc('darwins-monkey')
assert.ok(!('error' in monkey))
if (!('error' in monkey)) {
  assert.equal(monkey.assetId, 'darwins-monkey')
  assert.match(monkey.notes ?? '', /ceramic/)
  assert.match(monkey.notes ?? '', /cage/)
  assert.notEqual(monkey.assetId, 'statue-of-an-owl', 'negative: the monkey must not reuse owl annotations')
  const home = monkey.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
  assert.ok(home, 'Monkey must bake a Home viewpoint')
  assert.deepEqual(home?.camera, [2.4, 1.6, 3.2])
  assert.deepEqual(home?.target, [0, 0.5, 0])
  assert.ok(home?.orbit?.radius && home.orbit.radius > 3, 'Monkey Home starts at the toolkit default until a closer session is pasted')
}

const lantern = bakedAnnotationDoc('stone-lantern')
assert.ok(!('error' in lantern))
if (!('error' in lantern)) {
  assert.equal(lantern.assetId, 'stone-lantern')
  assert.match(lantern.notes ?? '', /ceramic/)
  assert.match(lantern.notes ?? '', /cage/)
  assert.notEqual(lantern.assetId, 'darwins-monkey', 'negative: the lantern must not reuse monkey annotations')
  const home = lantern.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
  assert.ok(home, 'Lantern must bake a Home viewpoint')
  assert.deepEqual(home?.camera, [1.633256967213942, 1.0427497008611162, 0.6704999748236201])
  assert.deepEqual(home?.target, [0.8755412251224172, 0.8665476314666367, -0.960723841114815])
  assert.ok(home?.orbit?.radius && home.orbit.radius < 2, 'Lantern Home is the copied closer framing')
  assert.notDeepEqual(home?.camera, [2.4, 1.6, 3.2], 'negative: toolkit default Home must not stay on the lantern')
  const top = lantern.annotations.find((mark) => mark.id === 'point-lantern-top')
  assert.equal(top?.label, 'Top')
  assert.equal(top?.kind, 'point')
  assert.equal(top?.objectName, 'defaultMaterial')
  assert.equal(top?.impulse, true)
  assert.ok(top?.normal, 'Top keeps the baked surface normal')
  assert.deepEqual(top?.position, [-0.005590911492065141, 1.3988513618834952, 0.0023428747137600936])
  assert.notEqual(top?.kind, 'viewpoint', 'negative: Top is an inspect tag, not a Home-camera viewpoint')
}

const cloud = bakedAnnotationDoc('volumetric-cloud')
assert.ok(!('error' in cloud))
if (!('error' in cloud)) {
  assert.equal(cloud.assetId, 'volumetric-cloud')
  assert.equal(
    cloud.annotations.some((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home'),
    true,
  )
}

const gras = bakedAnnotationDoc('gras-letters')
assert.ok(!('error' in gras))
if (!('error' in gras)) {
  assert.equal(gras.assetId, 'gras-letters')
  assert.match(gras.notes ?? '', /Megrim/)
  const home = gras.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
  const adamHome = !('error' in adam)
    ? adam.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
    : undefined
  assert.deepEqual(home?.position, adamHome?.position)
  assert.deepEqual(home?.camera, adamHome?.camera)
  assert.deepEqual(home?.target, adamHome?.target)
  assert.deepEqual(home?.orbit, adamHome?.orbit)
  assert.notDeepEqual(
    home?.camera,
    [2.1, 1.05, 2.8],
    'negative: GRAS Home must not look from +Z while the scene looks from −X',
  )
}

const aboutUs = bakedAnnotationDoc('about-us-letters')
assert.ok(!('error' in aboutUs))
if (!('error' in aboutUs)) {
  assert.equal(aboutUs.assetId, 'about-us-letters')
  assert.match(aboutUs.notes ?? '', /Megrim/)
  assert.match(aboutUs.notes ?? '', /About Us/)
  assert.match(aboutUs.notes ?? '', /no leave reverse/)
  assert.match(aboutUs.notes ?? '', /cursor lamp/)
  const home = aboutUs.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
  const adamHome = !('error' in adam)
    ? adam.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
    : undefined
  assert.deepEqual(home?.position, adamHome?.position)
  assert.deepEqual(home?.camera, adamHome?.camera)
  assert.deepEqual(home?.target, adamHome?.target)
  assert.deepEqual(home?.orbit, adamHome?.orbit)
  assert.notEqual(aboutUs.assetId, 'gras-letters', 'negative: About Us must not reuse the GRAS annotation file')
}

const projectsLetters = bakedAnnotationDoc('projects-letters')
assert.ok(!('error' in projectsLetters))
if (!('error' in projectsLetters)) {
  assert.equal(projectsLetters.assetId, 'projects-letters')
  assert.match(projectsLetters.notes ?? '', /Megrim/)
  assert.match(projectsLetters.notes ?? '', /Projects/)
  const home = projectsLetters.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
  const owlHome = !('error' in owl)
    ? owl.annotations.find((mark) => mark.kind === 'viewpoint' && mark.id === 'viewpoint-home')
    : undefined
  assert.deepEqual(home?.camera, owlHome?.camera)
  assert.deepEqual(home?.target, owlHome?.target)
  assert.notEqual(projectsLetters.assetId, 'about-us-letters', 'negative: Projects must not reuse the About Us annotation file')
}

assert.deepEqual(
  [...bakedAssetIds()].sort(),
  [...WEBGL_ASSETS.map((asset) => asset.id)].sort(),
  'every registered asset must have a baked JSON doc',
)

const missing = bakedAnnotationDoc('no-such-asset')
assert.ok('error' in missing, 'negative: unknown asset must fail')
assert.match(missing.error, /no baked annotations/)

console.log('assetDocs: ok')
