import type { gsap as GsapNS } from 'gsap'
import { runSlideshowZoomCrossfade } from './slideshowZoomCrossfade'
import type { SlideshowFxId, SlideshowNavigateCtx } from './slideshowTypes'

type Gsap = typeof GsapNS

export function navigateDemo1(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const currentInner = ctx.slidesInner[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1.5,
            ease: 'power4.inOut',
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            yPercent: -direction * 100,
          },
          'start'
        )
        .to(
          currentInner,
          {
            yPercent: direction * 30,
          },
          'start'
        )
        .fromTo(
          upcomingSlide,
          {
            yPercent: direction * 100,
          },
          {
            yPercent: 0,
          },
          'start'
        )
        .fromTo(
          upcomingInner,
          {
            yPercent: -direction * 30,
            //yPercent: 0
          },
          {
            yPercent: 0,
          },
          'start'
        );
    
}

export function navigateDemo2(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const currentInner = ctx.slidesInner[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1.5,
            ease: 'power4.inOut',
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            yPercent: -direction * 100,
          },
          'start'
        )
        .to(
          currentInner,
          {
            yPercent: direction * 30,
            startAt: {
              transformOrigin: direction === 1 ? '0% 100%' : '100% 0%',
              rotation: 0,
            },
            rotation: -direction * 10,
            scaleY: 2.5,
          },
          'start'
        )
        .to(
          upcomingSlide,
          {
            startAt: {
              yPercent: direction * 100,
            },
            yPercent: 0,
          },
          'start'
        )
        .to(
          upcomingInner,
          {
            startAt: {
              transformOrigin: direction === 1 ? '0% 0%' : '100% 100%',
              yPercent: -direction * 30,
              scaleY: 2.5,
              rotation: -direction * 10,
            },
            yPercent: 0,
            scaleY: 1,
            rotation: 0,
          },
          'start'
        );
    
}

export function navigateDemo3(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      const currentSlide = ctx.slides[previous];
      const currentInner = ctx.slidesInner[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];

      runSlideshowZoomCrossfade(gsap, {
        currentSlide,
        currentInner,
        upcomingSlide,
        upcomingInner,
        direction,
        onStart: () => {
          ctx.slides[ctx.current].classList.add('slide--current');
          gsap.set(upcomingSlide, { zIndex: 99 });
        },
        onComplete: () => {
          ctx.slides[previous].classList.remove('slide--current');
          gsap.set(upcomingSlide, { zIndex: 1 });
          ctx.isAnimating = false;
        },
      });
    
}

export function navigateDemo4(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1.25,
            ease: 'power4.inOut',
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
            gsap.set(upcomingSlide, { zIndex: 99 });
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            gsap.set(upcomingSlide, { zIndex: 1 });
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            duration: 0.4,
            ease: 'sine',
            scale: 0.9,
            autoAlpha: 0.2,
          },
          'start'
        )
        .to(
          currentSlide,
          {
            yPercent: -direction * 20,
            autoAlpha: 0,
          },
          'start+=0.1'
        )
        .fromTo(
          upcomingSlide,
          {
            autoAlpha: 1,
            scale: 1,
            yPercent: direction * 100,
          },
          {
            yPercent: 0,
          },
          'start+=0.1'
        )
        .fromTo(
          upcomingInner,
          {
            yPercent: -direction * 50,
          },
          {
            yPercent: 0,
          },
          'start+=0.1'
        );
    
}

export function navigateDemo5(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1.1,
            ease: 'power2.inOut',
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            scale: 0.6,
            yPercent: -direction * 90,
            rotation: direction * 20,
            autoAlpha: 0,
          },
          'start'
        )
        .fromTo(
          upcomingSlide,
          {
            scale: 0.8,
            yPercent: direction * 100,
            rotation: 0,
            autoAlpha: 1,
          },
          {
            scale: 1,
            yPercent: 0,
          },
          'start+=0.1'
        )
        .fromTo(
          upcomingInner,
          {
            scale: 1.1,
          },
          {
            scale: 1,
          },
          'start+=0.1'
        );
    
}

export function navigateDemo6(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current = direction === 1 ?
        ctx.current < ctx.slidesTotal - 1 ? ++ctx.current : 0 :
        ctx.current > 0 ? --ctx.current : ctx.slidesTotal - 1
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const currentInner = ctx.slidesInner[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1.6,
            ease: 'power3.inOut'
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            // Reset animation flag
            ctx.isAnimating = false;
          }
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(currentSlide, {
          xPercent: -direction * 100
        }, 'start')
        .to(currentInner, {
          startAt: { transformOrigin: direction === 1 ? '100% 50%' : '0% 50%' },
          scaleX: 4
        }, 'start')
        .fromTo(upcomingSlide, {
          xPercent: direction * 100
        }, {
          xPercent: 0
        }, 'start')
        .fromTo(upcomingInner, {
          transformOrigin: direction === 1 ? '0% 50%' : '100% 50%',
          xPercent: -direction * 100,
          scaleX: 4
        }, {
          xPercent: 0,
          scaleX: 1
        }, 'start');
    
}

export function navigateDemo7(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1.2,
            ease: 'expo',
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
            gsap.set(upcomingSlide, { zIndex: 99 });
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            gsap.set(upcomingSlide, { zIndex: 1 });
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            ease: 'power2',
            autoAlpha: 0,
          },
          'start'
        )
        .fromTo(
          upcomingSlide,
          {
            autoAlpha: 1,
            scale: 0,
            yPercent: direction * 100,
          },
          {
            scale: 1,
            yPercent: 0,
          },
          'start'
        )
        .fromTo(
          upcomingInner,
          {
            scale: 2,
            filter: 'brightness(600%)',
          },
          {
            scale: 1,
            filter: 'brightness(100%)',
          },
          'start'
        );
    
}

export function navigateDemo8(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const currentInner = ctx.slidesInner[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
            gsap.set(upcomingSlide, { zIndex: 99 });
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            gsap.set(upcomingSlide, { zIndex: 1 });
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .fromTo(
          upcomingSlide,
          {
            autoAlpha: 1,
            scale: 0.1,
            xPercent: direction * 100,
          },
          {
            duration: 0.7,
            ease: 'expo',
            scale: 0.4,
            xPercent: 0,
          },
          'start'
        )
        .fromTo(
          upcomingInner,
          {
            filter: 'contrast(100%) saturate(100%)',
            transformOrigin: '100% 50%',
            scaleX: 4,
          },
          {
            duration: 0.7,
            ease: 'expo',
            scaleX: 1,
          },
          'start'
        )
        .fromTo(
          currentInner,
          {
            filter: 'contrast(100%) saturate(100%)',
          },
          {
            duration: 0.7,
            ease: 'expo',
            filter: 'contrast(120%) saturate(140%)',
          },
          'start'
        )
  
        .addLabel('middle', 'start+=0.6')
        .to(
          upcomingSlide,
          {
            duration: 1,
            ease: 'power4.inOut',
            scale: 1,
          },
          'middle'
        )
        .to(
          currentSlide,
          {
            duration: 1,
            ease: 'power4.inOut',
            scale: 0.98,
            autoAlpha: 0,
          },
          'middle'
        );
    
}

export function navigateDemo9(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const upcomingSlide = ctx.slides[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1.2,
            ease: 'expo',
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
            gsap.set(upcomingSlide, { zIndex: 99 });
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            gsap.set(upcomingSlide, { zIndex: 1 });
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            duration: 1,
            ease: 'power4',
            rotation: 500,
            scale: 0,
            xPercent: -20,
            onComplete: () =>
              gsap.set(currentSlide, {
                rotation: 0,
                scale: 1,
                autoAlpha: 0,
              }),
          },
          'start'
        )
        .fromTo(
          upcomingSlide,
          {
            autoAlpha: 0,
            scale: 1.4,
            rotation: -90,
            xPercent: 20,
          },
          {
            duration: 0.6,
            ease: 'power4',
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            xPercent: 0,
          },
          'start+=0.3'
        );
    
}

export function navigateDemo10(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const upcomingSlide = ctx.slides[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1,
            ease: 'power3.inOut',
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
            gsap.set(upcomingSlide, { zIndex: 99 });
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            gsap.set(upcomingSlide, { zIndex: 1 });
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            xPercent: -direction * 15,
            yPercent: -direction * 15,
            autoAlpha: 0,
          },
          'start'
        )
  
        .fromTo(
          upcomingSlide,
          {
            autoAlpha: 1,
            xPercent: direction * 100,
            yPercent: direction * 100,
          },
          {
            xPercent: 0,
            yPercent: 0,
          },
          'start'
        );
    
}

export function navigateDemo11(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const currentInner = ctx.slidesInner[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1.3,
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            //ctx.slides[ctx.current].classList.add('slide--current');
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            duration: 0.4,
            ease: 'power2.in',
            yPercent: -direction * 100,
          },
          'start'
        )
        .to(
          currentInner,
          {
            duration: 0.4,
            ease: 'power2.in',
            yPercent: direction * 75,
            rotation: -direction * 2,
          },
          'start'
        )
        .fromTo(
          ctx.deco,
          {
            yPercent: direction * 100,
            autoAlpha: 1,
          },
          {
            duration: 0.4,
            ease: 'power2.in',
            yPercent: 0,
          },
          'start'
        )
  
        .addLabel('middle', 'start+=0.5')
        .to(
          ctx.deco,
          {
            ease: 'expo',
            yPercent: -direction * 100,
          },
          'middle'
        )
        .fromTo(
          upcomingSlide,
          {
            autoAlpha: 1,
            yPercent: direction * 100,
          },
          {
            ease: 'expo',
            yPercent: 0,
          },
          'middle'
        )
        .fromTo(
          upcomingInner,
          {
            yPercent: -direction * 75,
            rotation: direction * 2,
          },
          {
            ease: 'expo',
            yPercent: 0,
            rotation: 0,
          },
          'middle'
        );
    
}

export function navigateDemo12(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const currentInner = ctx.slidesInner[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];
  
      // Animation sequence using GSAP
      ctx.tl = gsap
        .timeline({
          defaults: {
            duration: 1.2,
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            duration: 0.4,
            ease: 'power2.in',
            xPercent: -direction * 100,
          },
          'start'
        )
        .to(
          currentInner,
          {
            duration: 0.4,
            ease: 'power2.in',
            xPercent: direction * 75,
            rotation: -direction * 6,
          },
          'start'
        )
        .fromTo(
          ctx.deco,
          {
            xPercent: direction * 100,
            autoAlpha: 1,
          },
          {
            duration: 0.4,
            ease: 'power2.in',
            xPercent: 0,
          },
          'start'
        );
      const decoItems = Array.isArray(ctx.deco) ? ctx.deco : ctx.deco ? [ctx.deco] : []
      decoItems.forEach((_, pos, arr) => {
        ctx.tl?.to(
          arr[arr.length - 1 - pos],
          {
            ease: 'power4',
            xPercent: -direction * 100,
          },
          `start+=${(pos + 1) * 0.2}`
        );
      });
      ctx.tl?.addLabel('middle', '<')
        .fromTo(
          upcomingSlide,
          {
            autoAlpha: 1,
            xPercent: direction * 100,
          },
          {
            ease: 'power4',
            xPercent: 0,
          },
          'middle'
        )
        .fromTo(
          upcomingInner,
          {
            xPercent: -direction * 75,
            rotation: direction * 6,
          },
          {
            ease: 'power4',
            xPercent: 0,
            rotation: 0,
          },
          'middle'
        );
    
}

export function navigateDemo13(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  gsap.set(ctx.el, { perspective: 1000 });
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const upcomingSlide = ctx.slides[ctx.current];
      const upcomingInner = ctx.slidesInner[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1.2,
            ease: 'power3.inOut',
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
            gsap.set(upcomingSlide, { zIndex: 99 });
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            gsap.set(upcomingSlide, { zIndex: 1 });
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            yPercent: -direction * 100,
          },
          'start'
        )
        .fromTo(
          upcomingSlide,
          {
            yPercent: 0,
            autoAlpha: 0,
            rotationX: 140,
            scale: 0.1,
            z: -1000,
          },
          {
            autoAlpha: 1,
            rotationX: 0,
            z: 0,
            scale: 1,
          },
          'start+=0.1'
        )
        .fromTo(
          upcomingInner,
          {
            scale: 1.8,
          },
          {
            scale: 1,
          },
          'start+=0.17'
        );
    
}

export function navigateDemo14(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const upcomingSlide = ctx.slides[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 1.2,
            ease: 'power4.inOut',
          },
          onStart: () => {
            // Add class to the upcoming slide to mark it as current
            ctx.slides[ctx.current].classList.add('slide--current');
          },
          onComplete: () => {
            // Remove class from the previous slide to unmark it as current
            ctx.slides[previous].classList.remove('slide--current');
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
        .to(
          currentSlide,
          {
            startAt: {
              transformOrigin: direction === 1 ? '0% 50%' : '100% 50%',
            },
            scaleX: 0,
            autoAlpha: 0,
          },
          'start'
        )
        .fromTo(
          upcomingSlide,
          {
            transformOrigin: direction === 1 ? '100% 50%' : '0% 50%',
            autoAlpha: 0,
            scaleX: 0,
          },
          {
            autoAlpha: 1,
            scaleX: 1,
          },
          'start'
        );
    
}

export function navigateDemo15(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const upcomingSlide = ctx.slides[ctx.current];
  
      // Animation sequence using GSAP
      gsap
        .timeline({
          defaults: {
            duration: 0.8,
            ease: 'power3.inOut',
          },
          onComplete: () => {
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0)
  
        .fromTo(
          ctx.deco,
          {
            yPercent: (pos) => (pos ? -100 : 100),
            autoAlpha: 1,
          },
          {
            yPercent: (pos) => (pos ? -50 : 50),
          },
          'start'
        )
        .to(
          currentSlide,
          {
            scale: 1.1,
            rotation: direction * 2,
          },
          'start'
        )
  
        .addLabel('middle', '>')
        .add(() => {
          // Remove class from the previous slide to unmark it as current
          ctx.slides[previous].classList.remove('slide--current');
          // Add class to the upcoming slide to mark it as current
          ctx.slides[ctx.current].classList.add('slide--current');
        }, 'middle')
        .to(
          ctx.deco,
          {
            duration: 1.1,
            ease: 'expo',
            yPercent: (pos) => (pos ? -100 : 100),
          },
          'middle'
        )
  
        .fromTo(
          upcomingSlide,
          {
            scale: 1.1,
            rotation: direction * 2,
          },
          {
            duration: 1.1,
            ease: 'expo',
            scale: 1,
            rotation: 0,
          },
          'middle'
        );
    
}

export function navigateDemo16(gsap: Gsap, ctx: SlideshowNavigateCtx, direction: number) {
  
      // Check if animation is already running
      if (ctx.isAnimating) return false;
      ctx.isAnimating = true;
  
      // Update the current slide index based on direction
      const previous = ctx.current;
      ctx.current =
        direction === 1
          ? ctx.current < ctx.slidesTotal - 1
            ? ++ctx.current
            : 0
          : ctx.current > 0
          ? --ctx.current
          : ctx.slidesTotal - 1;
  
      // Get the current and upcoming slides and their inner elements
      const currentSlide = ctx.slides[previous];
      const upcomingSlide = ctx.slides[ctx.current];
  
      // Animation sequence using GSAP
      ctx.tl = gsap
        .timeline({
          defaults: {
            duration: 0.8,
            ease: 'power4.inOut',
          },
          onComplete: () => {
            // Reset animation flag
            ctx.isAnimating = false;
          },
        })
        // Defining animation steps
        .addLabel('start', 0);
  
      const decoItems = Array.isArray(ctx.deco) ? ctx.deco : ctx.deco ? [ctx.deco] : []
      decoItems.forEach((_, pos, arr) => {
        const deco = arr[arr.length - 1 - pos];
        ctx.tl?.fromTo(
          deco,
          {
            xPercent: (_) => (pos % 2 === 1 ? -100 : 100),
            autoAlpha: 1,
          },
          {
            xPercent: (_) => (pos % 2 === 1 ? -50 : 50),
            onComplete: () => {
              if (pos === arr.length - 1) {
                // Remove class from the previous slide to unmark it as current
                ctx.slides[previous].classList.remove('slide--current');
                // Add class to the upcoming slide to mark it as current
                ctx.slides[ctx.current].classList.add('slide--current');
              }
            },
          },
          `start+=${Math.floor((arr.length - 1 - pos) / 2) * 0.14}`
        );
        if (!pos) {
          ctx.tl?.addLabel('middle', '>');
        }
      });
  
      ctx.tl?.to(
        currentSlide,
        {
          ease: 'power4.in',
          scale: 0.1,
          onComplete: () => gsap.set(currentSlide, { scale: 1 }),
        },
        'start'
      );
  
      decoItems.forEach((_, pos, arr) => {
        const deco = arr[arr.length - 1 - pos];
  
        ctx.tl?.to(
          deco,
          {
            xPercent: (_) => (pos % 2 === 1 ? -100 : 100),
          },
          `middle+=${Math.floor(pos / 2) * 0.12}`
        );
      });
  
      ctx.tl?.fromTo(
        upcomingSlide,
        {
          scale: 0.6,
        },
        {
          duration: 1.1,
          ease: 'expo',
          scale: 1,
        },
        '>-0.8'
      );
    
}

export const SLIDESHOW_NAVIGATORS: Record<SlideshowFxId, typeof navigateDemo1> = {
  demo1: navigateDemo1,
  demo2: navigateDemo2,
  demo3: navigateDemo3,
  demo4: navigateDemo4,
  demo5: navigateDemo5,
  demo6: navigateDemo6,
  demo7: navigateDemo7,
  demo8: navigateDemo8,
  demo9: navigateDemo9,
  demo10: navigateDemo10,
  demo11: navigateDemo11,
  demo12: navigateDemo12,
  demo13: navigateDemo13,
  demo14: navigateDemo14,
  demo15: navigateDemo15,
  demo16: navigateDemo16,
}

export const SLIDESHOW_FX_META = [
  { id: 'demo1' as const, name: 'Vertical parallax', purpose: 'Y-slide with inner parallax', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo1' },
  { id: 'demo2' as const, name: 'Skew scale rotate', purpose: 'ScaleY + rotation exit', deco: 'none' as const, hostModifiers: ['demo2'], stack: 'gsap.timeline · demo2' },
  { id: 'demo3' as const, name: 'Zoom crossfade', purpose: 'Scale zoom between slides', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo3' },
  { id: 'demo4' as const, name: 'Scale cover', purpose: 'Incoming covers at scale 0.9', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo4' },
  { id: 'demo5' as const, name: 'Rotate scale', purpose: 'Rotate and scale swap', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo5' },
  { id: 'demo6' as const, name: 'Stretch X wipe', purpose: 'Horizontal scaleX stretch', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo6' },
  { id: 'demo7' as const, name: 'Brightness pop', purpose: 'Scale + brightness filter', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo7' },
  { id: 'demo8' as const, name: 'Contrast stretch', purpose: 'Scale + contrast/saturate', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo8' },
  { id: 'demo9' as const, name: 'Clip peel', purpose: 'Clip-path peel transition', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo9' },
  { id: 'demo10' as const, name: 'Filter morph', purpose: 'Filter + scale morph', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo10' },
  { id: 'demo11' as const, name: 'Deco curtain', purpose: 'Single deco wipe between slides', deco: 'single' as const, hostModifiers: [], stack: 'gsap.timeline · demo11' },
  { id: 'demo12' as const, name: 'Triple deco', purpose: 'Three deco bands', deco: 'stack12' as const, hostModifiers: [], stack: 'gsap.timeline · demo12' },
  { id: 'demo13' as const, name: '3D flip X', purpose: 'perspective rotationX', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo13' },
  { id: 'demo14' as const, name: 'ScaleX wipe', purpose: 'Horizontal scaleX reveal', deco: 'none' as const, hostModifiers: [], stack: 'gsap.timeline · demo14' },
  { id: 'demo15' as const, name: 'Dual deco flash', purpose: 'Two deco bands + scale', deco: 'dual15' as const, hostModifiers: [], stack: 'gsap.timeline · demo15' },
  { id: 'demo16' as const, name: 'Multi deco cascade', purpose: 'Six deco panels cascade', deco: 'multi16' as const, hostModifiers: [], stack: 'gsap.timeline · demo16' },
] as const
