import { HEALTH_PASS_MAX_HOURS, HEALTH_WARN_MAX_HOURS } from './constants'

export type HealthStatus = 'pass' | 'warn' | 'fail'

export function evaluateHealthFromLastSeen(lastSeenAt: Date, now = new Date()): HealthStatus {
  const ageHours = (now.getTime() - lastSeenAt.getTime()) / (1000 * 60 * 60)
  if (ageHours < HEALTH_PASS_MAX_HOURS) return 'pass'
  if (ageHours < HEALTH_WARN_MAX_HOURS) return 'warn'
  return 'fail'
}

export function ageHoursFromLastSeen(lastSeenAt: Date, now = new Date()): number {
  return (now.getTime() - lastSeenAt.getTime()) / (1000 * 60 * 60)
}
