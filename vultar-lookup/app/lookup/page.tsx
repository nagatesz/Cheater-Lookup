'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import { Search, Shield, AlertTriangle, CheckCircle, Loader2, ExternalLink, Clock, Database, Zap } from 'lucide-react'
import clsx from 'clsx'

type LookupResult = {
  found: boolean
  discord_id: string
  username?: string
  avatar_url?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  confidence?: number
  servers?: string[]
  source?: string[]
  notes?: string
  roblox_username?: string
  evidence_links?: string[]
  created_at?: string
  xtracker_entries?: Array<{
    reason: string
    flagged_at: string
    roblox_username?: string
    evidence?: string
    flagged_by?: string
  }>
}

const SEVERITY_CONFIG = {
  low:      { label: 'LOW RISK',      color: 'text-green-400',  border: 'border-green-800',  bg: 'bg-green-950',  glow: false },
  medium:   { label: 'MEDIUM RISK',   color: 'text-yellow-400', border: 'border-yellow-800', bg: 'bg-yellow-950', glow: false },
  high:     { label: 'HIGH RISK',     color: 'text-red-400',    border: 'border-red-800',    bg: 'bg-red-950',    glow: false },
  critical: { label: 'CRITICAL',      color: 'text-[#ff3333]',  border: 'border-[#ff3333]',  bg: 'bg-red-950',    glow: true  },
}

export default function LookupPage() {
  const [inputId, setInputId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const id = inputId.trim()
    if (!id || !/^\d{17,20}$/.test(id)) {
      setError('Invalid Discord ID — must be 17–20 digits.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setSearched(false)

    try {
      const res = await fetch(`/api/lookup/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lookup failed')
      setResult(data)
      setSearched(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sev = result?.found && result.severity ? SEVERITY_CONFIG[result.severity] : null

  return (
    <>
      <Nav />
      <main className="min-h-screen grid-bg pt-14 px-4 pb-12">
        <div className="max-w-2xl mx-auto pt-12">

          {/* Header */}
          <div className="mb-8 fade-up">
            <p className="font-mono text-xs text-steel tracking-widest mb-1">// ANTI-CHEAT DATABASE</p>
            <h1 className="font-barlow font-700 text-4xl tracking-wide text-bright">
              DISCORD ID <span className="text-crimson">LOOKUP</span>
            </h1>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="panel p-5 corner-tl corner-br relative mb-6 fade-up-2">
            <label className="block font-mono text-xs text-steel tracking-widest mb-2">
              TARGET DISCORD ID
            </label>
            <div className="flex gap-2">
              <input
                value={inputId}
                onChange={e => setInputId(e.target.value)}
                placeholder="e.g. 123456789012345678"
                className="search-input flex-1 px-4 py-2.5 text-sm"
                maxLength={20}
                inputMode="numeric"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-crimson hover:bg-crimsonHot disabled:opacity-50 transition-colors px-5 py-2.5 text-white font-barlow font-600 tracking-widest text-sm flex items-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {loading ? 'SCANNING...' : 'SCAN'}
              </button>
            </div>
            {error && (
              <p className="text-red-400 font-mono text-xs mt-2 flex items-center gap-1">
                <AlertTriangle size={11} /> {error}
              </p>
            )}
          </form>

          {/* Loading state */}
          {loading && (
            <div className="panel p-8 text-center fade-up">
              <Loader2 size={28} className="text-crimson animate-spin mx-auto mb-3" />
              <p className="font-mono text-sm text-steel">Querying database &amp; XTracker...</p>
            </div>
          )}

          {/* CLEAN result */}
          {searched && result && !result.found && (
            <div className="panel p-6 border-green-900 fade-up">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle size={22} className="text-green-400" />
                <div>
                  <h2 className="font-barlow font-700 text-xl text-green-400 tracking-wide">NOT FOUND</h2>
                  <p className="font-mono text-xs text-steel">No records in Vultar DB or XTracker</p>
                </div>
              </div>
              <div className="bg-[#0a0a0f] border border-[#1e1e30] px-4 py-2 font-mono text-sm text-steel">
                ID: <span className="text-bright">{result.discord_id}</span>
              </div>
              <p className="text-sm text-steel mt-3 font-rajdhani">
                This Discord ID has no flags in our database. They may still be unreported — use your judgement.
              </p>
            </div>
          )}

          {/* FLAGGED result */}
          {searched && result && result.found && sev && (
            <div className={clsx('panel fade-up', sev.glow && 'glow-red')}>
              {/* Severity banner */}
              <div className={clsx('px-5 py-3 border-b border-[#1e1e30] flex items-center justify-between', sev.bg)}>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className={sev.color} />
                  <span className={clsx('font-barlow font-700 text-lg tracking-widest', sev.color)}>
                    {sev.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-steel">CONFIDENCE</span>
                  <span className={clsx('font-mono font-700 text-sm', sev.color)}>
                    {result.confidence ?? 0}%
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* User identity */}
                <div className="flex items-center gap-3">
                  {result.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.avatar_url} alt="" className="w-10 h-10 rounded-sm border border-[#1e1e30]" />
                  ) : (
                    <div className="w-10 h-10 bg-[#0f0f1a] border border-[#1e1e30] flex items-center justify-center">
                      <Shield size={16} className="text-steel" />
                    </div>
                  )}
                  <div>
                    <p className="font-barlow font-700 text-bright text-lg">
                      {result.username || 'Unknown User'}
                    </p>
                    {result.roblox_username && (
                      <p className="font-mono text-xs text-steel">
                        Roblox: <span className="text-crimson">{result.roblox_username}</span>
                      </p>
                    )}
                  </div>
                </div>

                <hr className="divider" />

                {/* Discord ID + date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-mono text-xs text-steel mb-1 tracking-wider">DISCORD ID</p>
                    <p className="font-mono text-sm text-bright bg-[#0a0a0f] border border-[#1e1e30] px-3 py-1.5">
                      {result.discord_id}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-steel mb-1 tracking-wider">DATE ADDED</p>
                    <p className="font-mono text-sm text-bright bg-[#0a0a0f] border border-[#1e1e30] px-3 py-1.5 flex items-center gap-1">
                      <Clock size={11} className="text-steel" />
                      {result.created_at ? new Date(result.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Sources / servers */}
                {result.servers && result.servers.length > 0 && (
                  <div>
                    <p className="font-mono text-xs text-steel mb-2 tracking-wider">FOUND IN SERVERS</p>
                    <div className="flex flex-wrap gap-2">
                      {result.servers.map(s => (
                        <span key={s} className="font-mono text-xs border border-[#1e1e30] bg-[#0a0a0f] px-2 py-1 text-steel">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source tags */}
                {result.source && result.source.length > 0 && (
                  <div className="flex items-center gap-2">
                    {result.source.includes('xtracker') && (
                      <span className="flex items-center gap-1 font-mono text-xs text-yellow-400 border border-yellow-900 bg-yellow-950 px-2 py-0.5">
                        <Zap size={10} /> XTRACKER
                      </span>
                    )}
                    {result.source.includes('manual') && (
                      <span className="flex items-center gap-1 font-mono text-xs text-steel border border-[#1e1e30] bg-[#0a0a0f] px-2 py-0.5">
                        <Database size={10} /> CLAN REPORT
                      </span>
                    )}
                  </div>
                )}

                {/* Notes */}
                {result.notes && (
                  <div>
                    <p className="font-mono text-xs text-steel mb-1 tracking-wider">NOTES</p>
                    <p className="font-rajdhani text-steel bg-[#0a0a0f] border border-[#1e1e30] px-3 py-2 text-sm leading-relaxed">
                      {result.notes}
                    </p>
                  </div>
                )}

                {/* XTracker entries */}
                {result.xtracker_entries && result.xtracker_entries.length > 0 && (
                  <div>
                    <p className="font-mono text-xs text-steel mb-2 tracking-wider flex items-center gap-1">
                      <Zap size={10} className="text-yellow-400" /> XTRACKER LOG ENTRIES
                    </p>
                    <div className="space-y-2">
                      {result.xtracker_entries.map((e, i) => (
                        <div key={i} className="bg-[#0a0a0f] border border-[#1e1e30] px-3 py-2">
                          <p className="font-rajdhani text-sm text-bright">{e.reason}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs font-mono text-steel">
                            <span>{new Date(e.flagged_at).toLocaleDateString()}</span>
                            {e.roblox_username && <span>Roblox: {e.roblox_username}</span>}
                            {e.flagged_by && <span>by {e.flagged_by}</span>}
                          </div>
                          {e.evidence && (
                            <a href={e.evidence} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-mono text-crimson hover:text-crimsonHot flex items-center gap-1 mt-1">
                              <ExternalLink size={10} /> View Evidence
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence links */}
                {result.evidence_links && result.evidence_links.length > 0 && (
                  <div>
                    <p className="font-mono text-xs text-steel mb-2 tracking-wider">EVIDENCE</p>
                    <div className="space-y-1">
                      {result.evidence_links.map((link, i) => (
                        <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 font-mono text-xs text-crimson hover:text-crimsonHot transition-colors">
                          <ExternalLink size={10} /> {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
