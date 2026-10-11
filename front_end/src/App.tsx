import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { GsapPageProvider } from './lib/gsap'
import { LenisScrollProvider } from './components/LenisScrollProvider'
import { TitleLoop } from './components/TitleLoop'
import { applyViewportScale } from './lib/viewport/shortViewport'
import { AppRoutes } from './routes/appRoutes'

function App() {
  useEffect(() => {
    const apply = () => applyViewportScale(document.documentElement, window.innerHeight)
    apply()
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      document.documentElement.style.removeProperty('zoom')
      document.documentElement.style.removeProperty('--lcl-scale')
      document.documentElement.removeAttribute('data-lcl-scale')
    }
  }, [])

  return (
    <LenisScrollProvider>
      <GsapPageProvider>
        <BrowserRouter>
          <TitleLoop />
          <AppRoutes />
        </BrowserRouter>
      </GsapPageProvider>
    </LenisScrollProvider>
  )
}

export default App
