import { getXTrackerKeyCount } from '@/lib/xtracker'

export function getScanSettings() {
  const keyCount = getXTrackerKeyCount()
  // Fewer parallel workers = less chance of rate-limit false cleans
  const concurrency = Math.max(1, Math.min(keyCount, 5))
  // 2s pause per worker between members — one dedicated key per worker
  const workerDelayMs = 2000

  return { concurrency, workerDelayMs, keysConfigured: keyCount }
}
