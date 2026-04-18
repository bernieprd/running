import { Routes, Route, useLocation } from 'react-router-dom'
import { SignIn, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import { RunsProvider } from './context/RunsContext'
import { BottomNav, SideNav } from './components/BottomNav'
import { DetailOverlay } from './components/DetailOverlay'
import { HomeView } from './views/HomeView'
import { ScheduleView } from './views/ScheduleView'
import { CoachView } from './views/CoachView'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}

export default function App() {
  const location = useLocation()
  const state = location.state as { backgroundLocation?: Location } | null
  const backgroundLocation = state?.backgroundLocation

  return (
    <Routes>
      <Route path="/login" element={
        <div className="h-[100dvh] bg-background flex items-center justify-center">
          <SignIn routing="hash" afterSignInUrl="/" />
        </div>
      } />
      <Route path="/*" element={
        <ProtectedRoute>
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
        </ProtectedRoute>
      } />
    </Routes>
  )
}
