import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { fetchRuns, patchRun } from '../lib/api'
import type { RunResponse, PatchRunBody } from '../lib/types'

interface RunsState {
  runs: RunResponse[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: RunResponse[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'UPDATE_RUN'; payload: RunResponse }

function reducer(state: RunsState, action: Action): RunsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return { runs: action.payload, loading: false, error: null }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload }
    case 'UPDATE_RUN':
      return {
        ...state,
        runs: state.runs.map(r => r.id === action.payload.id ? action.payload : r),
      }
  }
}

interface RunsContextValue {
  state: RunsState
  updateRun: (id: string, body: PatchRunBody) => Promise<void>
  refetch: () => void
}

const RunsContext = createContext<RunsContextValue | null>(null)

export function RunsProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth()
  const [state, dispatch] = useReducer(reducer, { runs: [], loading: true, error: null })

  const load = useCallback(async () => {
    dispatch({ type: 'FETCH_START' })
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const runs = await fetchRuns(token)
      dispatch({ type: 'FETCH_SUCCESS', payload: runs })
    } catch (e) {
      dispatch({ type: 'FETCH_ERROR', payload: (e as Error).message })
    }
  }, [getToken])

  useEffect(() => { load() }, [load])

  const updateRun = useCallback(async (id: string, body: PatchRunBody) => {
    const original = state.runs.find(r => r.id === id)
    if (!original) return

    const optimistic: RunResponse = {
      ...original,
      ...(body.completed !== undefined ? { completed: body.completed } : {}),
      ...(body.completedAt !== undefined ? { completedAt: body.completedAt ?? null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.effortRating !== undefined ? { effortRating: body.effortRating as RunResponse['effortRating'] } : {}),
    }
    dispatch({ type: 'UPDATE_RUN', payload: optimistic })

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const updated = await patchRun(id, body, token)
      dispatch({ type: 'UPDATE_RUN', payload: updated })
    } catch {
      dispatch({ type: 'UPDATE_RUN', payload: original })
    }
  }, [state.runs, getToken])

  return (
    <RunsContext.Provider value={{ state, updateRun, refetch: load }}>
      {children}
    </RunsContext.Provider>
  )
}

export function useRuns() {
  const ctx = useContext(RunsContext)
  if (!ctx) throw new Error('useRuns must be used inside RunsProvider')
  return ctx
}
