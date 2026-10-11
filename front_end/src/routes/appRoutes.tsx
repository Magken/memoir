import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PageLoader } from '../components/Loader'
import { ThemeProvider } from '../lib/theme'
import { MemoirHomePage } from '../pages/MemoirHomePage'

const WglToolkitPage = lazy(() =>
  import('../pages/WglToolkitPage').then((module) => ({ default: module.WglToolkitPage })),
)

function RouteLoadingFallback() {
  return (
    <ThemeProvider>
      <PageLoader fill label="Loading page…" />
    </ThemeProvider>
  )
}

function withRouteFallback(page: ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{page}</Suspense>
}

/**
 * `/memoir/home` is the MEMOIR app home; `/WGLTOOLKIT` is the splat loader.
 * Every other path lands on the MEMOIR home.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/memoir/home" element={<MemoirHomePage />} />
      <Route path="/WGLTOOLKIT" element={withRouteFallback(<WglToolkitPage />)} />
      <Route path="/wgltoolkit" element={<Navigate to="/WGLTOOLKIT" replace />} />
      <Route path="*" element={<Navigate to="/memoir/home" replace />} />
    </Routes>
  )
}
