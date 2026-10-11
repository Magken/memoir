import { AiMicIcon, Calendar03Icon } from '@hugeicons/core-free-icons'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  ButtonHoverFx,
  type ButtonHoverFxMarqueeContent,
} from '../components/ButtonHoverFx'
import { PageScrollType } from '../components/PageScrollType'
import {
  SceneMenuShell,
  type SceneMenuShellBookingApi,
} from '../components/SceneMenuShell'
import { HomeFooter } from '../components/HomeFooter'
import { DeferredHomeScene } from '../components/DeferredHomeScene'
import { IsometricWordCloud } from '../components/IsometricWordCloud'
import { VurifyOfferAccordion } from '../components/VurifyOfferAccordion'
import { useThemeScrollParallax } from '../hooks/useThemeScrollParallax'
import { GsapPageProvider, useGsapPage } from '../lib/gsap'
import {
  ISOMETRIC_WORD_CLOUD_SCENE,
  homeWordCloudHostHidden,
  type IsometricWordCloudCameraView,
  type IsometricWordCloudFraming,
} from '../lib/isometrics/isometricWordCloud'
import {
  HOME_SCENE_STACK_CATEGORIES,
  HOME_SCENE_STACK_FOOTER,
  HOME_SCENE_STACK_LAUNCH_AUTH_OPTIONS,
} from '../lib/menus/homeNavLinks'
import {
  vurifyOfferInfoArticle,
  type SceneStackMenuInfoArticle,
} from '../lib/menus/sceneStackMenuInfo'
import { animateScrollTop, scrollTopForElement } from '../lib/scroll/scrollSpeedCap'
import { ThemeProvider } from '../lib/theme'
import { useAppStage } from '../lib/appStage/appStageContext'
import { VURIFY_REF_PATHS } from '../lib/vurifyRef/paths'
import type { TryInterviewKitId } from '../lib/tryInterview/tryInterviewKits'
import { DEFERRED_EXTRAS_SCENE_ROOT_MARGIN } from '../lib/visualActivity'
import { homeBootstrapDisplayProgress, preloadHomeMedia } from '../lib/homeAssets/preloadHomeMedia'
import { HomeHowItWorksScene } from './HomeHowItWorksScene'
import { HomeMoreFeaturesScene } from './HomeMoreFeaturesScene'
import { HomePricingScene } from './HomePricingScene'
import { HomeTryInterviewScene } from './HomeTryInterviewScene'
import { HomeTryVurifyScene } from './HomeTryVurifyScene'
import { HomeWhatWeDoScene } from './HomeWhatWeDoScene'

const TRY_VURIFY_MARQUEE_CONTENT = {
  label: 'Try Vurify',
  marqueeLabel: 'Walk the path',
  sideIcon: AiMicIcon,
  sideIconPlacement: 'end',
} satisfies ButtonHoverFxMarqueeContent

const BOOK_NOW_MARQUEE_CONTENT = {
  label: 'Book now',
  marqueeLabel: 'Talk through a fit',
  sideIcon: Calendar03Icon,
  sideIconPlacement: 'start',
} satisfies ButtonHoverFxMarqueeContent

/**
 * Fraction of `camera.introDuration` before landing copy mounts.
 * Home bootstrap owns 0–100 → V first; copy waits for the front→oblique settle.
 */
const LANDING_COPY_INTRO_RATIO = 1

/** Soft-launch landing line — Auryn overview, plain voice. */
const LANDING_SUBTEXT =
  'We help you find, assess, and decide with an output card you can read.'

void preloadHomeMedia()

type HomeLandingCopyProps = {
  active: boolean
  scrollerRef: RefObject<HTMLDivElement | null>
  onOpenBooking?: () => void
  onTryInterview?: () => void
}

function HomeLandingCopy({
  active,
  scrollerRef,
  onOpenBooking,
  onTryInterview,
}: HomeLandingCopyProps) {
  const copyRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtextRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const { reducedMotion } = useGsapPage()

  useThemeScrollParallax({
    scopeRef: copyRef,
    scrollerRef,
    reducedMotion,
    enabled: active,
    layers: [
      { target: titleRef, speed: 0.05 },
      { target: subtextRef, speed: 0.06 },
      { target: ctaRef, speed: 0.08 },
    ],
  })

  const scrollToNextScene = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const next = scroller.querySelector<HTMLElement>('#home-scene-2')
    if (!next) return
    animateScrollTop(scroller, scrollTopForElement(scroller, next), {
      immediate: reducedMotion,
    })
  }, [reducedMotion, scrollerRef])

  if (!active) return null

  const titleLine = (text: string, line: 1 | 2 | 3, delay: number) =>
    reducedMotion ? (
      <span className={`page-scene--home__line page-scene--home__line--${line}`}>
        <span className="page-scene--home__line-inner">{text}</span>
      </span>
    ) : (
      <span className={`page-scene--home__line page-scene--home__line--${line}`}>
        <PageScrollType
          text={text}
          effect={6}
          mode="once"
          className="page-scene--home__line-inner page-scene--home__line-inner--scroll-type"
          replayKey={`landing-${line}`}
          delay={delay}
        />
      </span>
    )

  return (
    <div ref={copyRef} className="page-scene--home__content">
      <div className="page-scene--home__copy">
        <h1 ref={titleRef} className="page-scene--home__title type-display-xl mb-2">
          {titleLine('Talent', 1, 0)}
          {titleLine('made', 2, 0.22)}
          {titleLine('visible', 3, 0.44)}
        </h1>
        <div className="page-scene--home__lower">
          <p
            ref={subtextRef}
            className="page-scene--home__subtext type-body-lg type-muted"
          >
            {LANDING_SUBTEXT}
          </p>
          <div ref={ctaRef} className="page-scene--home__cta-row">
            <div className="page-scene--home__cta-reveal">
              <ButtonHoverFx
                variant="marquee-menu"
                size="md"
                marqueeContent={TRY_VURIFY_MARQUEE_CONTENT}
                housing
                className="page-scene--home__cta"
                aria-label="Try Vurify"
                onClick={onTryInterview}
              />
              <ButtonHoverFx
                variant="marquee-menu"
                size="md"
                marqueeContent={BOOK_NOW_MARQUEE_CONTENT}
                housing
                className="page-scene--home__cta"
                aria-label="Book now"
                onClick={onOpenBooking}
              />
            </div>
          </div>
          <button
            type="button"
            className="page-scene--home__scroll-cue"
            aria-label="Scroll to next section"
            onClick={scrollToNextScene}
          >
            <span className="page-scene--home__scroll-cue-label type-caption type-muted">
              Scroll
            </span>
            <span className="page-scene--home__scroll-cue-track" aria-hidden="true">
              <span className="page-scene--home__scroll-cue-line" />
              <span className="page-scene--home__scroll-cue-thumb" />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

type HomeWhatWeOfferSceneProps = {
  scrollerRef: RefObject<HTMLDivElement | null>
  onOpenInfo?: (itemId: string) => void
}

function HomeWhatWeOfferScene({ scrollerRef, onOpenInfo }: HomeWhatWeOfferSceneProps) {
  const { reducedMotion } = useGsapPage()

  return (
    <section
      id="home-scene-3"
      className="page-scene page-scene--home-what-we-offer"
      aria-label="What gets it done"
    >
      <div className="page-scene--home-what-we-offer__content">
        <div className="page-scene--home-what-we-offer__title-block">
          {reducedMotion ? (
            <h2 className="page-scene--home-what-we-offer__title type-display-lg">
              What gets it{' '}
              <span className="page-scene--home-what-we-offer__word--accent">done</span>
            </h2>
          ) : (
            <PageScrollType
              as="h2"
              text="What gets it done"
              effect={2}
              mode="enter"
              scrollerRef={scrollerRef}
              className="page-scene--home-what-we-offer__title type-display-lg theme-page-scroll-type--center theme-page-scroll-type--block"
              start="top 85%"
              wordClassNames={{
                done: 'page-scene--home-what-we-offer__word--accent',
              }}
            />
          )}
        </div>
        <div className="page-scene--home-what-we-offer__body theme-shell-divider">
          <VurifyOfferAccordion scrollerRef={scrollerRef} onOpenInfo={onOpenInfo} />
        </div>
      </div>
    </section>
  )
}

function HomeScene() {
  const {
    stageReady,
    activePath,
    stageProgress,
    bootstrapSurface,
    reportCurtainLoadingComplete,
    goTryInterview,
  } = useAppStage()
  const [cameraView, setCameraView] =
    useState<IsometricWordCloudCameraView>('front')
  const [framing, setFraming] = useState<IsometricWordCloudFraming>('default')
  const [copyReady, setCopyReady] = useState(false)
  const [entrancePending, setEntrancePending] = useState(false)
  const [offerInfoArticle, setOfferInfoArticle] = useState<SceneStackMenuInfoArticle | null>(
    null,
  )
  const [homeMediaReady, setHomeMediaReady] = useState(false)
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const bookingApiRef = useRef<SceneMenuShellBookingApi | null>(null)
  const { reducedMotion } = useGsapPage()

  const openOfferInfo = useCallback((itemId: string) => {
    const article = vurifyOfferInfoArticle(itemId)
    if (article) setOfferInfoArticle(article)
  }, [])

  const openBooking = useCallback(() => {
    bookingApiRef.current?.openBooking()
  }, [])

  const openTryInterview = useCallback(() => {
    goTryInterview()
  }, [goTryInterview])

  const openTryInterviewKit = useCallback(
    (kit: TryInterviewKitId) => {
      goTryInterview({ kit })
    },
    [goTryInterview],
  )

  const closeOfferInfo = useCallback(() => {
    setOfferInfoArticle(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    void preloadHomeMedia().then(() => {
      if (!cancelled) setHomeMediaReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 40rem)')
    const sync = () => {
      setFraming(mq.matches ? 'mobileLanding' : 'default')
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  /** First boot on `/` — landing owns `%`→V instead of CurtainLoading. */
  const homeOwnsBootstrap = bootstrapSurface === 'home' && !stageReady
  /** Live on Home after bootstrap unlock — drives front→oblique + copy. */
  const homeLive = stageReady && activePath === VURIFY_REF_PATHS.landing
  /** WebGL loop: parked Home, or settled ≤40rem (CSS-hidden cloud), stay off. */
  const wordCloudLoop =
    homeOwnsBootstrap ||
    (homeLive && (framing !== 'mobileLanding' || !copyReady))
  const cloudActive = homeOwnsBootstrap || homeLive
  const cloudHostHidden = homeWordCloudHostHidden({
    homeOwnsBootstrap,
    homeLive,
    entrancePending,
  })

  useEffect(() => {
    if (homeOwnsBootstrap) {
      setEntrancePending(false)
      return
    }
    if (!homeLive) setEntrancePending(true)
  }, [homeLive, homeOwnsBootstrap])

  const handleLoadingComplete = useCallback(() => {
    if (bootstrapSurface !== 'home') return
    void preloadHomeMedia().finally(() => {
      reportCurtainLoadingComplete()
    })
  }, [bootstrapSurface, reportCurtainLoadingComplete])

  useEffect(() => {
    if (!homeLive) {
      // Reset while parked / during bootstrap so the next land can tween front→oblique.
      setCameraView('front')
      setCopyReady(false)
      return
    }

    if (reducedMotion) {
      // Mobile keeps a head-on fill; desktop still settles oblique.
      setCameraView(framing === 'mobileLanding' ? 'front' : 'oblique')
      setCopyReady(true)
      return
    }

    // Mobile half-stage: stay front + zoomed; desktop: front→oblique for left-rail copy.
    setCameraView(framing === 'mobileLanding' ? 'front' : 'oblique')
    const timeout = window.setTimeout(
      () => setCopyReady(true),
      framing === 'mobileLanding'
        ? 320
        : ISOMETRIC_WORD_CLOUD_SCENE.camera.introDuration *
            1000 *
            LANDING_COPY_INTRO_RATIO,
    )
    return () => window.clearTimeout(timeout)
  }, [homeLive, reducedMotion, framing])

  return (
    <SceneMenuShell
      categories={HOME_SCENE_STACK_CATEGORIES}
      footerItems={HOME_SCENE_STACK_FOOTER}
      pageFooter={({ onNavigate, onCloseFooter, footerMode, contactEntry, footerSurface }) => (
        <HomeFooter
          onNavigate={onNavigate}
          onCloseFooter={onCloseFooter}
          requestedMode={footerMode}
          contactEntry={contactEntry}
          footerSurface={footerSurface}
        />
      )}
      viewportRef={scrollViewportRef}
      authOptions={HOME_SCENE_STACK_LAUNCH_AUTH_OPTIONS}
      scrollLocked={homeOwnsBootstrap || !homeLive}
      infoArticle={offerInfoArticle}
      onCloseInfo={closeOfferInfo}
      bookingApiRef={bookingApiRef}
    >
      <main
        id="home-scene-1"
        className={[
          'page-scene',
          'page-scene--home',
          homeOwnsBootstrap ? 'page-scene--home--loading' : '',
          homeLive && copyReady ? 'page-scene--home--settled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Home"
        aria-busy={!homeLive || !copyReady}
      >
        <IsometricWordCloud
          className="page-scene--home__word-cloud"
          mode={homeOwnsBootstrap ? 'loading' : 'cloud'}
          progress={
            homeOwnsBootstrap
              ? homeBootstrapDisplayProgress(stageProgress, homeMediaReady)
              : undefined
          }
          cameraView={cameraView}
          /* `%` uses mobileLoading (desktop scale); settled pack zooms via mobileLanding.
           * Host stays top 3/4 either way — no canvas resize teleport.
           * Settled ≤40rem hides the cloud (keeps mount) and uses motto + CTAs as hero. */
          framing={
            homeOwnsBootstrap && framing === 'mobileLanding'
              ? 'mobileLoading'
              : framing
          }
          mouseFollow={wordCloudLoop}
          waveEnabled={wordCloudLoop}
          frameloop={wordCloudLoop ? 'always' : 'never'}
          visibilityRootRef={scrollViewportRef}
          active={cloudActive}
          onEntranceStart={() => setEntrancePending(false)}
          onLoadingComplete={homeOwnsBootstrap ? handleLoadingComplete : undefined}
        />
        <div
          className="page-scene--home__word-cloud-veil"
          data-hidden={cloudHostHidden ? 'true' : undefined}
          aria-hidden="true"
        />
        <HomeLandingCopy
          active={copyReady}
          scrollerRef={scrollViewportRef}
          onOpenBooking={openBooking}
          onTryInterview={openTryInterview}
        />
      </main>
      <DeferredHomeScene
        id="home-scene-2"
        label="What we do"
        sceneClass="page-scene--home-what-we-do"
        scrollerRef={scrollViewportRef}
        eager={homeOwnsBootstrap || homeLive}
      >
        <HomeWhatWeDoScene scrollerRef={scrollViewportRef} />
      </DeferredHomeScene>
      <DeferredHomeScene
        id="home-scene-3"
        label="What gets it done"
        sceneClass="page-scene--home-what-we-offer"
        scrollerRef={scrollViewportRef}
        eager={homeOwnsBootstrap || homeLive}
      >
        <HomeWhatWeOfferScene scrollerRef={scrollViewportRef} onOpenInfo={openOfferInfo} />
      </DeferredHomeScene>
      <DeferredHomeScene
        id="home-scene-4"
        label="How it Works"
        sceneClass="page-scene--home-how-it-works"
        scrollerRef={scrollViewportRef}
        eager={homeOwnsBootstrap || homeLive}
      >
        <HomeHowItWorksScene scrollerRef={scrollViewportRef} onOpenBooking={openBooking} />
      </DeferredHomeScene>
      <DeferredHomeScene
        id="home-scene-4b"
        label="More Vurify features"
        sceneClass="page-scene--home-more-features"
        scrollerRef={scrollViewportRef}
        rootMargin={DEFERRED_EXTRAS_SCENE_ROOT_MARGIN}
        eager={homeOwnsBootstrap || homeLive}
      >
        <HomeMoreFeaturesScene scrollerRef={scrollViewportRef} />
      </DeferredHomeScene>
      <DeferredHomeScene
        id="home-scene-5"
        label="Pricing"
        sceneClass="page-scene--home-pricing"
        scrollerRef={scrollViewportRef}
        eager={homeOwnsBootstrap || homeLive}
      >
        <HomePricingScene scrollerRef={scrollViewportRef} onOpenBooking={openBooking} />
      </DeferredHomeScene>
      <DeferredHomeScene
        id="home-scene-6"
        label="What people say about Vurify"
        sceneClass="page-scene--home-try-vurify"
        scrollerRef={scrollViewportRef}
        eager={homeOwnsBootstrap || homeLive}
      >
        <HomeTryVurifyScene scrollerRef={scrollViewportRef} />
      </DeferredHomeScene>
      <DeferredHomeScene
        id="home-scene-7"
        label="Take a test interview"
        sceneClass="page-scene--home-try-interview"
        scrollerRef={scrollViewportRef}
        eager={homeOwnsBootstrap || homeLive}
      >
        <HomeTryInterviewScene scrollerRef={scrollViewportRef} onTakeInterview={openTryInterviewKit} />
      </DeferredHomeScene>
    </SceneMenuShell>
  )
}

export function HomePage() {
  return (
    <GsapPageProvider timing={{ layout: { pageLengthVph: 1 } }}>
      <ThemeProvider>
        <HomeScene />
      </ThemeProvider>
    </GsapPageProvider>
  )
}
