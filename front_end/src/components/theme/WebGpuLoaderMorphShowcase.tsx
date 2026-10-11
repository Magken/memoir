import { Link } from 'react-router-dom'
import { GALLERY_DEMO_IMAGES, galleryDemoImageSrc } from '../../lib/galleries/galleryDemoImages'
import { WebGpuTransitionGallery } from '../WebGpuTransitionGallery'

const demoImages = GALLERY_DEMO_IMAGES.slice(0, 5).map((item) => ({
  src: galleryDemoImageSrc(item.src, 1400),
  alt: item.alt,
  title: item.title,
  text: item.text,
}))

export function WebGpuLoaderMorphShowcase() {
  return (
    <div className="space-y-6">
      <p className="type-body-sm type-muted prose-measure mb-0">
        Dummy 0–100 image load, then the hero shrinks into the first WebGPU gallery slot and the
        rail becomes scrollable. Built on the same engine as{' '}
        <Link className="underline" to="/theme?section=gallery-webgpu">
          WebGPU mode transitions
        </Link>
        .
      </p>
      <WebGpuTransitionGallery
        images={demoImages}
        intro="loader-morph"
        label="Loader-to-gallery morph demo"
      />
    </div>
  )
}
