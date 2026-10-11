import type { gsap as GsapType } from 'gsap'
import type { ScrollTrigger as STType } from 'gsap/ScrollTrigger'

type Gsap = typeof GsapType
type ScrollTrigger = typeof STType

const lettersAndSymbols =
  'abcdefghijklmnopqrstuvwxyz!@#$%^&*-_+=;:<>,'.split('')

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Apply a Codrops effect to the scoped React-rendered word and character nodes. */
export function applyScrollTypeFx(
  id: number,
  title: HTMLElement,
  gsap: Gsap,
  _ScrollTrigger: ScrollTrigger,
): void {
  if (prefersReducedMotion()) {
    gsap.set(
      title.querySelectorAll('.theme-scroll-type__char, .theme-scroll-type__word'),
      { clearProps: 'all', opacity: 1 },
    )
    return
  }

  const chars = title.querySelectorAll('.theme-scroll-type__char')
  const words = title.querySelectorAll('.theme-scroll-type__word')

  switch (id) {
    case 1:
      gsap.fromTo(
        chars,
        { opacity: 0, scale: 0.6, rotationZ: () => gsap.utils.random(-20, 20) },
        {
          ease: 'power4',
          opacity: 1,
          scale: 1,
          rotation: 0,
          stagger: 0.4,
          scrollTrigger: { trigger: title, start: 'center+=20% bottom', end: '+=50%', scrub: true },
        },
      )
      break
    case 2:
      // Match pageScrollType Effect 2 — shallower rise so fast scrub does not over-stretch.
      gsap.fromTo(
        chars,
        { opacity: 0, yPercent: 55, scaleY: 1.55, scaleX: 0.85, transformOrigin: '50% 0%' },
        {
          duration: 1,
          ease: 'back.inOut(2)',
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          stagger: 0.03,
          scrollTrigger: { trigger: title, start: 'center bottom+=50%', end: 'bottom top+=40%', scrub: true },
        },
      )
      break
    case 3:
      gsap.fromTo(
        chars,
        { transformOrigin: '50% 0%', scaleY: 0 },
        {
          ease: 'back',
          opacity: 1,
          scaleY: 1,
          stagger: 0.03,
          scrollTrigger: { trigger: title, start: 'center bottom-=5%', end: 'top top-=20%', scrub: true },
        },
      )
      break
    case 4:
      words.forEach((word) => {
        const wordChars = word.querySelectorAll('.theme-scroll-type__char')
        gsap.fromTo(
          wordChars,
          { x: (position, _t, arr) => 150 * (position - arr.length / 2) },
          {
            ease: 'power1.inOut',
            x: 0,
            stagger: { grid: 'auto', from: 'center' },
            scrollTrigger: { trigger: word, start: 'center bottom+=30%', end: 'top top+=15%', scrub: true },
          },
        )
      })
      break
    case 5:
      gsap.fromTo(
        chars,
        {
          opacity: 0,
          xPercent: () => gsap.utils.random(-200, 200),
          yPercent: () => gsap.utils.random(-150, 150),
        },
        {
          ease: 'power1.inOut',
          opacity: 1,
          xPercent: 0,
          yPercent: 0,
          stagger: { each: 0.05, grid: 'auto', from: 'random' },
          scrollTrigger: { trigger: title, start: 'center bottom+=10%', end: 'bottom center', scrub: 0.9 },
        },
      )
      break
    case 6:
      words.forEach((word) => {
        const wordChars = word.querySelectorAll('.theme-scroll-type__char')
        wordChars.forEach((char) => gsap.set(char.parentNode as Element, { perspective: 2000 }))
        gsap.fromTo(
          wordChars,
          { opacity: 0, rotationX: -90, yPercent: 50 },
          {
            ease: 'power1.inOut',
            opacity: 1,
            rotationX: 0,
            yPercent: 0,
            stagger: { each: 0.03, from: 0 },
            scrollTrigger: { trigger: word, start: 'center bottom+=40%', end: 'bottom center-=30%', scrub: 0.9 },
          },
        )
      })
      break
    case 7:
      words.forEach((word) => {
        const wordChars = word.querySelectorAll('.theme-scroll-type__char')
        wordChars.forEach((char) => gsap.set(char.parentNode as Element, { perspective: 2000 }))
        gsap.fromTo(
          wordChars,
          { transformOrigin: '100% 50%', opacity: 0, rotationY: -90, z: -300 },
          {
            ease: 'expo',
            opacity: 1,
            rotationY: 0,
            z: 0,
            stagger: { each: 0.06, from: 'end' },
            scrollTrigger: { trigger: word, start: 'bottom bottom+=20%', end: 'bottom top', scrub: 1 },
          },
        )
      })
      break
    case 8:
      chars.forEach((char, position) => {
        const initialHTML = char.innerHTML
        gsap.fromTo(
          char,
          { opacity: 0 },
          {
            duration: 0.03,
            innerHTML: () => lettersAndSymbols[Math.floor(Math.random() * lettersAndSymbols.length)],
            repeat: 1,
            repeatRefresh: true,
            opacity: 1,
            repeatDelay: 0.03,
            delay: (position + 1) * 0.18,
            onComplete: () => gsap.set(char, { innerHTML: initialHTML, delay: 0.03 }),
            scrollTrigger: {
              trigger: title,
              start: 'top bottom',
              end: 'bottom center',
              toggleActions: 'play resume resume reset',
              onEnter: () => gsap.set(char, { opacity: 0 }),
            },
          },
        )
      })
      break
    case 9:
      words.forEach((word) => {
        const wordChars = word.querySelectorAll('.theme-scroll-type__char')
        gsap.fromTo(
          wordChars,
          {
            scaleX: 0,
            x: (_i, target) =>
              window.innerWidth / 2 - (target as HTMLElement).offsetLeft - (target as HTMLElement).offsetWidth / 2,
          },
          {
            ease: 'power1.inOut',
            scaleX: 1,
            x: 0,
            scrollTrigger: { trigger: word, start: 'top bottom', end: 'top top', scrub: true },
          },
        )
      })
      break
    case 10:
      gsap.fromTo(
        chars,
        { opacity: 0, filter: 'blur(20px)' },
        {
          duration: 0.25,
          ease: 'power1.inOut',
          opacity: 1,
          filter: 'blur(0px)',
          stagger: { each: 0.05, from: 'random' },
          scrollTrigger: {
            trigger: title,
            start: 'top bottom',
            end: 'center center',
            toggleActions: 'play resume resume reset',
          },
        },
      )
      break
    case 11:
      gsap.fromTo(
        chars,
        { transformOrigin: '0% 50%', xPercent: 105 },
        {
          duration: 1,
          ease: 'expo',
          xPercent: 0,
          stagger: 0.042,
          scrollTrigger: {
            trigger: title,
            start: 'top bottom',
            end: 'top top+=10%',
            toggleActions: 'play resume resume reset',
          },
        },
      )
      break
    case 12:
      gsap.fromTo(
        chars,
        { xPercent: -250, rotationZ: 45, scaleX: 6, transformOrigin: '100% 50%' },
        {
          duration: 1,
          ease: 'power2',
          xPercent: 0,
          rotationZ: 0,
          scaleX: 1,
          stagger: -0.06,
          scrollTrigger: { trigger: title, start: 'top bottom+=10%', end: 'bottom top+=10%', scrub: true },
        },
      )
      break
    case 13:
      chars.forEach((char) => gsap.set(char.parentNode as Element, { perspective: 2000 }))
      gsap.fromTo(
        chars,
        { opacity: 0, rotationY: 180, xPercent: -40, yPercent: 100 },
        {
          ease: 'power4.inOut',
          opacity: 1,
          rotationY: 0,
          xPercent: 0,
          yPercent: 0,
          stagger: { each: -0.03, from: 0 },
          scrollTrigger: { trigger: title, start: 'center bottom', end: 'bottom center-=30%', scrub: 0.9 },
        },
      )
      break
    case 14:
      gsap.fromTo(
        title,
        { xPercent: 100 },
        {
          ease: 'none',
          xPercent: 0,
          immediateRender: false,
          scrollTrigger: {
            trigger: title,
            scrub: true,
            start: 'center center',
            end: '+=100%',
            pin: title.parentElement,
            invalidateOnRefresh: true,
          },
        },
      )
      gsap.fromTo(
        chars,
        { scale: 3, yPercent: -900 },
        {
          ease: 'back(2)',
          scale: 1,
          yPercent: 0,
          stagger: 0.05,
          immediateRender: false,
          scrollTrigger: {
            trigger: title,
            start: 'center center',
            end: '+=100%',
            scrub: 1.9,
            invalidateOnRefresh: true,
          },
        },
      )
      break
    case 15:
      chars.forEach((char) => gsap.set(char.parentNode as Element, { perspective: 2000 }))
      gsap.fromTo(
        title,
        { xPercent: -80 },
        {
          ease: 'none',
          xPercent: 0,
          immediateRender: false,
          scrollTrigger: {
            trigger: title,
            scrub: true,
            start: 'center center',
            end: '+=100%',
            pin: title.parentElement,
            invalidateOnRefresh: true,
          },
        },
      )
      gsap.fromTo(
        chars,
        { transformOrigin: '50% 50% -200px', rotationX: 380, opacity: 0 },
        {
          ease: 'expo.inOut',
          rotationX: 0,
          opacity: 1,
          stagger: -0.03,
          immediateRender: false,
          scrollTrigger: {
            trigger: title,
            start: 'center center',
            end: '+=140%',
            scrub: 1.2,
            invalidateOnRefresh: true,
          },
        },
      )
      break
    case 16:
      gsap.fromTo(
        title,
        { transformOrigin: '0% 50%', rotate: 3 },
        {
          ease: 'none',
          rotate: 0,
          scrollTrigger: { trigger: title, start: 'top bottom', end: 'top top', scrub: true },
        },
      )
      gsap.fromTo(
        words,
        { opacity: 0.1 },
        {
          ease: 'none',
          opacity: 1,
          stagger: 0.05,
          scrollTrigger: { trigger: title, start: 'top bottom-=20%', end: 'center top+=20%', scrub: true },
        },
      )
      break
    case 17:
      chars.forEach((char) => gsap.set(char.parentNode as Element, { perspective: 1000 }))
      gsap.fromTo(
        chars,
        {
          opacity: 0,
          rotateX: () => gsap.utils.random(-120, 120),
          z: () => gsap.utils.random(-200, 200),
        },
        {
          ease: 'none',
          opacity: 1,
          rotateX: 0,
          z: 0,
          stagger: 0.02,
          scrollTrigger: { trigger: title, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
      break
    case 18:
      chars.forEach((char) => gsap.set(char.parentNode as Element, { perspective: 1000 }))
      gsap.fromTo(
        chars,
        { opacity: 0.2, z: -800 },
        {
          ease: 'back.out(1.2)',
          opacity: 1,
          z: 0,
          stagger: 0.04,
          scrollTrigger: { trigger: title, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
      break
    case 19:
      chars.forEach((char) => gsap.set(char.parentNode as Element, { perspective: 1000 }))
      gsap.fromTo(
        chars,
        { transformOrigin: '50% 0%', opacity: 0, rotationX: -90, z: -200 },
        {
          ease: 'power1',
          opacity: 1,
          stagger: 0.05,
          rotationX: 0,
          z: 0,
          scrollTrigger: { trigger: title, start: 'center bottom', end: 'bottom top+=20%', scrub: true },
        },
      )
      break
    case 20:
      chars.forEach((char) => gsap.set(char.parentNode as Element, { perspective: 1000 }))
      gsap.fromTo(
        chars,
        { transformOrigin: '50% 100%', opacity: 0, rotationX: 90 },
        {
          ease: 'power4',
          opacity: 1,
          stagger: { each: 0.03, from: 'random' },
          rotationX: 0,
          scrollTrigger: { trigger: title, start: 'center bottom', end: 'bottom top+=20%', scrub: true },
        },
      )
      break
    case 21:
      ;[...words].forEach((word) => {
        const wordChars = word.querySelectorAll('.theme-scroll-type__char')
        wordChars.forEach((char) => gsap.set(char.parentNode as Element, { perspective: 2000 }))
        gsap.fromTo(
          wordChars,
          {
            opacity: 0,
            y: (position, _t, arr) => -40 * Math.abs(position - arr.length / 2),
            z: () => gsap.utils.random(-1500, -600),
            rotationX: () => gsap.utils.random(-500, -200),
          },
          {
            ease: 'power1.inOut',
            opacity: 1,
            y: 0,
            z: 0,
            rotationX: 0,
            stagger: { each: 0.06, from: 'center' },
            scrollTrigger: { trigger: word, start: 'top bottom', end: 'top top+=15%', scrub: true },
          },
        )
      })
      break
    case 22:
      ;[...words].forEach((word) => {
        const wordChars = word.querySelectorAll('.theme-scroll-type__char')
        const charsTotal = wordChars.length
        wordChars.forEach((char) => gsap.set(char.parentNode as Element, { perspective: 1000 }))
        gsap.fromTo(
          wordChars,
          {
            x: (position) => {
              const factor =
                position < Math.ceil(charsTotal / 2)
                  ? position
                  : Math.ceil(charsTotal / 2) - Math.abs(Math.floor(charsTotal / 2) - position) - 1
              return (
                (charsTotal % 2
                  ? Math.abs(Math.ceil(charsTotal / 2) - 1 - factor)
                  : Math.abs(Math.ceil(charsTotal / 2) - factor)) *
                200 *
                (position < charsTotal / 2 ? -1 : 1)
              )
            },
            y: (position) => {
              const factor =
                position < Math.ceil(charsTotal / 2)
                  ? position
                  : Math.ceil(charsTotal / 2) - Math.abs(Math.floor(charsTotal / 2) - position) - 1
              return factor * 60
            },
            rotationY: -270,
            rotationZ: (position) => {
              const factor =
                position < Math.ceil(charsTotal / 2)
                  ? position
                  : Math.ceil(charsTotal / 2) - Math.abs(Math.floor(charsTotal / 2) - position) - 1
              return position < charsTotal / 2
                ? Math.abs(factor - charsTotal / 2) * 8
                : -1 * Math.abs(factor - charsTotal / 2) * 8
            },
          },
          {
            ease: 'power2.inOut',
            x: 0,
            y: 0,
            rotationZ: 0,
            rotationY: 0,
            scrollTrigger: { trigger: word, start: 'top bottom+=40%', end: 'top top+=15%', scrub: true },
          },
        )
      })
      break
    case 23:
      ;[...words].forEach((word, wordPosition) => {
        gsap.fromTo(
          word.querySelectorAll('.theme-scroll-type__char'),
          {
            scale: 0.01,
            x: (pos, _t, arr) => (wordPosition % 2 ? pos * 50 : (arr.length - pos - 1) * -50),
          },
          {
            ease: 'power4',
            scale: 1,
            x: 0,
            scrollTrigger: { trigger: word, start: 'center bottom', end: 'bottom top-=40%', scrub: true },
          },
        )
      })
      break
    case 24: {
      const charsTotal = chars.length
      gsap.fromTo(
        chars,
        {
          y: (position) => {
            const factor =
              position < Math.ceil(charsTotal / 2)
                ? position
                : Math.ceil(charsTotal / 2) - Math.abs(Math.floor(charsTotal / 2) - position) - 1
            return (charsTotal / 2 - factor + 6) * 130
          },
        },
        {
          ease: 'elastic.out(.4)',
          y: 0,
          stagger: { amount: 0.1, from: 'center' },
          scrollTrigger: { trigger: title, start: 'top bottom', end: 'bottom top-=50%', scrub: true },
        },
      )
      break
    }
    case 25:
      gsap.fromTo(
        chars,
        { transformOrigin: '50% 100%', scaleY: 0 },
        {
          ease: 'power3.in',
          opacity: 1,
          scaleY: 1,
          stagger: 0.05,
          scrollTrigger: {
            trigger: title,
            start: 'center center',
            end: '+=500%',
            scrub: true,
            pin: title.parentElement,
          },
        },
      )
      break
    case 26: {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: title,
          start: 'center center',
          end: '+=100%',
          scrub: true,
          pin: title.parentElement,
        },
      })
      ;[...words].forEach((word, wordPosition) => {
        tl.fromTo(
          word.querySelectorAll('.theme-scroll-type__char'),
          {
            transformOrigin: wordPosition % 2 === 0 ? '50% 0%' : '50% 100%',
            scaleY: 0,
          },
          {
            ease: 'power1.inOut',
            scaleY: 1,
            stagger: { amount: 0.3, from: 'center' },
          },
          0,
        )
      })
      break
    }
    case 27:
      words.forEach((word) => gsap.set(word.parentNode as Element, { perspective: 1000 }))
      gsap.fromTo(
        words,
        {
          z: () => gsap.utils.random(500, 950),
          opacity: 0,
          xPercent: () => gsap.utils.random(-100, 100),
          yPercent: () => gsap.utils.random(-10, 10),
          rotationX: () => gsap.utils.random(-90, 90),
        },
        {
          ease: 'expo',
          opacity: 1,
          rotationX: 0,
          xPercent: 0,
          yPercent: 0,
          z: 0,
          stagger: { each: 0.006, from: 'random' },
          scrollTrigger: {
            trigger: title,
            start: 'center center',
            end: '+=300%',
            scrub: true,
            pin: title.parentElement,
          },
        },
      )
      break
    case 28:
      ;[...words].forEach((word) => {
        const wordChars = word.querySelectorAll('.theme-scroll-type__char')
        const charsTotal = wordChars.length
        gsap.fromTo(
          wordChars,
          {
            transformOrigin: '50% 100%',
            scale: (position) => {
              const factor =
                position < Math.ceil(charsTotal / 2)
                  ? position
                  : Math.ceil(charsTotal / 2) - Math.abs(Math.floor(charsTotal / 2) - position) - 1
              return gsap.utils.mapRange(0, Math.ceil(charsTotal / 2), 0.5, 2.1, factor)
            },
            y: (position) => {
              const factor =
                position < Math.ceil(charsTotal / 2)
                  ? position
                  : Math.ceil(charsTotal / 2) - Math.abs(Math.floor(charsTotal / 2) - position) - 1
              return gsap.utils.mapRange(0, Math.ceil(charsTotal / 2), 0, 60, factor)
            },
            rotation: (position) => {
              const factor =
                position < Math.ceil(charsTotal / 2)
                  ? position
                  : Math.ceil(charsTotal / 2) - Math.abs(Math.floor(charsTotal / 2) - position) - 1
              return position < charsTotal / 2
                ? gsap.utils.mapRange(0, Math.ceil(charsTotal / 2), -4, 0, factor)
                : gsap.utils.mapRange(0, Math.ceil(charsTotal / 2), 0, 4, factor)
            },
            filter: 'blur(12px) opacity(0)',
          },
          {
            ease: 'power2.inOut',
            y: 0,
            rotation: 0,
            scale: 1,
            filter: 'blur(0px) opacity(1)',
            stagger: { amount: 0.15, from: 'center' },
            scrollTrigger: { trigger: word, start: 'top bottom+=40%', end: 'top top+=15%', scrub: true },
          },
        )
      })
      break
    case 29:
      ;[...words].forEach((word, pos) => {
        gsap.fromTo(
          word.querySelectorAll('.theme-scroll-type__char'),
          {
            transformOrigin: `${pos % 2 ? 0 : 100}% ${pos % 2 ? 100 : 0}%`,
            scale: 0,
          },
          {
            ease: 'power4',
            scale: 1,
            stagger: { each: 0.03, from: pos % 2 ? 'end' : 'start' },
            scrollTrigger: { trigger: word, start: 'top bottom-=10%', end: 'top top', scrub: true },
          },
        )
      })
      break
    default:
      break
  }
}
