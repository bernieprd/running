import { Routes, Route, useLocation } from 'react-router-dom'
import { RunsProvider } from './context/RunsContext'
import { BottomNav } from './components/BottomNav'
import { DetailOverlay } from './components/DetailOverlay'
import { HomeView } from './views/HomeView'
import { ScheduleView } from './views/ScheduleView'
import { CoachView } from './views/CoachView'

export default function App() {
  const location = useLocation()
  const state = location.state as { backgroundLocation?: Location } | null
  const backgroundLocation = state?.backgroundLocation

  return (
    <RunsProvider>
      <div className="relative h-[100dvh] max-w-[430px] mx-auto bg-background flex flex-col overflow-hidden">
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
    </RunsProvider>
  )
}
