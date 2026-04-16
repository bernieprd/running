import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
