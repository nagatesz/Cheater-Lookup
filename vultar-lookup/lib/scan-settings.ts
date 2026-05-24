import { getXTrackerKeyCount } from '@/lib/xtracker'

export function getScanSettings() {
  const keyCount = getXTrackerKeyCount()
  const concurrency = Math.max(1, keyCount)
  // 2s pause per worker between members — one dedicated key per worker
  const workerDelayMs = 2000

  return { concurrency, workerDelayMs, keysConfigured: keyCount }
}
