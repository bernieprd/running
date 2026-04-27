import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RunResponse } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function formatPace(minKm: number): string {
  const mins = Math.floor(minKm)
  const secs = Math.round((minKm - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}/km`
}

// Returns the Sunday that starts the calendar week containing `date`
function getWeekSunday(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

// Returns the current training week number based on today's date.
// Weeks run Sunday–Saturday; the week advances each Sunday regardless of completion.
export function getCurrentWeek(runs: RunResponse[]): number {
  const sorted = [...runs].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

  const weekFirstDates = new Map<number, Date>()
  for (const run of sorted) {
    if (run.week != null && run.date) {
      const d = new Date(run.date + 'T00:00:00')
      const existing = weekFirstDates.get(run.week)
      if (!existing || d < existing) weekFirstDates.set(run.week, d)
    }
  }

  const weekNumbers = [...weekFirstDates.keys()].sort((a, b) => a - b)
  if (weekNumbers.length === 0) return 1

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const firstWeekSunday = getWeekSunday(weekFirstDates.get(weekNumbers[0])!)
  if (today < firstWeekSunday) return weekNumbers[0]

  for (let i = 0; i < weekNumbers.length; i++) {
    const weekNum = weekNumbers[i]
    const weekStart = getWeekSunday(weekFirstDates.get(weekNum)!)
    const nextWeekNum = weekNumbers[i + 1]
    const nextWeekStart = nextWeekNum !== undefined
      ? getWeekSunday(weekFirstDates.get(nextWeekNum)!)
      : null

    if (today >= weekStart && (nextWeekStart === null || today < nextWeekStart)) {
      return weekNum
    }
  }

  return weekNumbers[weekNumbers.length - 1]
}

export function formatElapsedTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}
