import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CubeMenu3dFaceNav } from './CubeMenu3dFaceNav'
import { useCubeMenuScrollGallery } from '../hooks/useCubeMenuScrollGallery'
import { CUBE_MENU_SCROLL_GALLERY_SECTIONS } from '../lib/menus/cubeMenuScrollGallery'
import type { CubeMenu3dFaceId } from '../lib/menus/cubeMenu3d'

type CubeMenuScrollGalleryCardGap = 'flush' | 'tight' | 'normal' | 'wide'
type CubeMenuScrollGalleryCardLayout = 'side' | 'split'

type CubeMenuScrollGalleryProps = {
  label?: string
  className?: string
  faceBorder?: boolean
  /** Horizontal distance between text cards and the cube (`side` layout only) */
  cardGap?: CubeMenuScrollGalleryCardGap
  /** `side` = cards left of cube · `split` = cards alternate left/right around a centered cube (ref.image-carousel-12) */
  cardLayout?: CubeMenuScrollGalleryCardLayout
  /** Pseudo-3D — lift face buttons off the cube surface with layered shadows (no mouse follow) */
  buttonLift?: boolean
}

export function CubeMenuScrollGallery({
  label = 'Cube scroll gallery',
  className = '',
  faceBorder = false,
  cardGap = 'wide',
  cardLayout = 'side',
  buttonLift = false,
}: CubeMenuScrollGalleryProps) {
  const {
    galleryRef,
    cubeRef,
    registerSection,
    activeIndex,
    activeFace,
    scrollToIndex,
    scrollToFace,
  } = useCubeMenuScrollGallery()

  const rootClass = ['theme-cube-scroll-gallery', className].filter(Boolean).join(' ')

  const lastIndex = CUBE_MENU_SCROLL_GALLERY_SECTIONS.length - 1

  return (
    <div
      ref={galleryRef}
      className={rootClass}
      aria-label={label}
      data-card-gap={cardGap}
      data-card-layout={cardLayout}
      data-button-lift={buttonLift ? 'true' : undefined}
    >
      <div className="theme-cube-scroll-gallery__layout">
        <div className="theme-cube-scroll-gallery__track">
          {CUBE_MENU_SCROLL_GALLERY_SECTIONS.map((section, index) => (
            <section
              key={section.id}
              ref={registerSection(index)}
              id={`cube-gallery-${section.id}`}
              className={[
                'theme-cube-scroll-gallery__section',
                index === activeIndex ? 'theme-cube-scroll-gallery__section--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-side={index % 2 === 0 ? 'left' : 'right'}
              aria-current={index === activeIndex ? 'true' : undefined}
            >
              <article className="theme-cube-scroll-gallery__card">
                <span className="theme-cube-scroll-gallery__card-line" aria-hidden="true" />
                <div className="theme-cube-scroll-gallery__card-head">
                  <span className="theme-cube-scroll-gallery__index type-mono" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                    <span className="theme-cube-scroll-gallery__index-total">
                      /{String(lastIndex + 1).padStart(2, '0')}
                    </span>
                  </span>
                  <p className="theme-cube-scroll-gallery__tag type-overline">{section.tag}</p>
                </div>
                <h3 className="theme-cube-scroll-gallery__title type-display-sm">{section.title}</h3>
                <p className="theme-cube-scroll-gallery__body type-body-sm">{section.body}</p>
                <div className="theme-cube-scroll-gallery__cta-row">
                  {index > 0 ? (
                    <button
                      type="button"
                      className="theme-cube-scroll-gallery__cta theme-cube-scroll-gallery__cta--back type-label"
                      onClick={() => scrollToIndex(index - 1)}
                    >
                      <ChevronLeft aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
                      Back
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="theme-cube-scroll-gallery__cta type-label"
                    onClick={() => scrollToIndex(index < lastIndex ? index + 1 : 0)}
                  >
                    {index < lastIndex ? 'Next' : 'Restart'}
                    <ChevronRight aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
                  </button>
                </div>
              </article>
            </section>
          ))}
        </div>

        <div className="theme-cube-scroll-gallery__stage-wrap">
          <div className="theme-cube-scroll-gallery__scene">
            <div
              ref={cubeRef}
              className="theme-cube-scroll-gallery__cube"
              {...(faceBorder ? { 'data-face-border': 'true' } : {})}
            >
              {CUBE_MENU_SCROLL_GALLERY_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className="theme-cube-scroll-gallery__face"
                  data-face={section.id}
                  {...(section.id === activeFace ? { 'data-active-face': 'true' } : {})}
                >
                  <CubeMenu3dFaceNav
                    faceId={section.id}
                    label={`${label} — ${section.id}`}
                    onNavigate={(face: CubeMenu3dFaceId) => scrollToFace(face)}
                  />
                </div>
              ))}
            </div>
          </div>

          <nav className="theme-cube-scroll-gallery__dots" aria-label="Gallery scenes">
            {CUBE_MENU_SCROLL_GALLERY_SECTIONS.map((section, index) => (
              <button
                key={section.id}
                type="button"
                className={[
                  'theme-cube-scroll-gallery__dot',
                  index === activeIndex ? 'theme-cube-scroll-gallery__dot--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={section.tag}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => scrollToIndex(index)}
              />
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
