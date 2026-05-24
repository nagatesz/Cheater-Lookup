import { getXTrackerKeyCount } from '@/lib/xtracker'

export function getScanSettings() {
  const keyCount = getXTrackerKeyCount()
  const concurrency = Math.max(1, keyCount)
  const waveDelayMs =
    keyCount >= 8 ? 0 : keyCount >= 5 ? 25 : keyCount >= 3 ? 75 : 200

  return { concurrency, waveDelayMs, keysConfigured: keyCount }
}
