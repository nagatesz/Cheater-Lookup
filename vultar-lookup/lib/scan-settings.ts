import { getXTrackerKeyCount } from '@/lib/xtracker'

export function getScanSettings() {
  const keyCount = getXTrackerKeyCount()
  const concurrency = Math.max(1, keyCount)
  // Small pause per worker between lookups — keeps accuracy under load
  const workerDelayMs = keyCount >= 8 ? 120 : keyCount >= 5 ? 150 : 200

  return { concurrency, workerDelayMs, keysConfigured: keyCount }
}
