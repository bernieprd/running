import { Routes, Route, useLocation, useMatch } from 'react-router-dom'
import { RunsProvider } from './context/RunsContext'
import { BottomNav, SideNav } from './components/BottomNav'
import { DetailOverlay } from './components/DetailOverlay'
import { HomeView } from './views/HomeView'
import { ScheduleView } from './views/ScheduleView'
import { CoachView } from './views/CoachView'

export default function App() {
  const location = useLocation()
  const state = location.state as { backgroundLocation?: Location } | null
  const isRunDetail = useMatch('/runs/:id')

  // When arriving directly at /runs/:id (e.g. Figma capture), there is no
  // backgroundLocation state. Fall back to /schedule so the overlay renders.
  const backgroundLocation =
    state?.backgroundLocation ??
    (isRunDetail ? { ...location, pathname: '/schedule', state: null } : undefined)

  return (
    <RunsProvider>
      <div className="h-[100dvh] bg-background flex justify-center">
        <div className="flex flex-col sm:flex-row w-full max-w-[430px] sm:max-w-none">
          <SideNav />
          <div className="relative flex flex-col flex-1 overflow-hidden sm:w-[430px] sm:flex-none sm:border-x sm:border-border">
            <main className="flex-1 overflow-y-auto">
              <Routes location={backgroundLocation ?? location}>
                <Route path="/" element={<HomeView />} />
                <Route path="/schedule" element={<ScheduleView />} />
                <Route path="/coach" element={<CoachView />} />
              </Routes>
            </main>

            {backgroundLocation && (
              <Routes>
                <Route path="/runs/:id" element={<DetailOverlay />} />
              </Routes>
            )}

            <BottomNav />
          </div>
        </div>
      </div>
    </RunsProvider>
  )
}
