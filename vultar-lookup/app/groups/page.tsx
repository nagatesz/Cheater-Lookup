'use client'
import { useState, useRef, useEffect } from 'react'
import Nav from '@/components/Nav'
import { Shield, Loader2, Play, AlertTriangle, CheckCircle, Database, Zap, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

const CLANS = [
  { name: 'VULTAR', groups: [35685159, 35685173] },
  { name: 'SOL', groups: [2764561] },
  { name: 'SURGE', groups: [12434378] }
]

type Member = {
  id: number
  username: string
  rank: string
  groupId: number
  status: 'pending' | 'checking' | 'clean' | 'flagged'
  result?: any
}

export default function GroupsPage() {
  const [activeClan, setActiveClan] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  
  const [isScanning, setIsScanning] = useState(false)
  const [scanIndex, setScanIndex] = useState(0)
  
  const [visibleCount, setVisibleCount] = useState(100)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Stop scanning flag (ref so it can be updated immediately)
  const stopScanRef = useRef(false)

  async function loadRoster(clanName: string, groupIds: number[]) {
    setActiveClan(clanName)
    setLoadingRoster(true)
    setMembers([])
    setIsScanning(false)
    setScanIndex(0)
    setProgress({ current: 0, total: 0 })
    stopScanRef.current = true // Stop any ongoing scans

    try {
      const allMembers: Member[] = []
      
      for (const groupId of groupIds) {
        // Fetch roles
        const roleRes = await fetch(`/api/roblox/group-roles?groupId=${groupId}`)
        if (!roleRes.ok) continue
        const roleData = await roleRes.json()
        
        for (const role of roleData.roles) {
          let cursor = ''
          do {
            const memRes = await fetch(`/api/roblox/group-members?groupId=${groupId}&roleId=${role.id}&cursor=${cursor}`)
            if (!memRes.ok) break
            const memData = await memRes.json()
            
            for (const user of memData.data) {
              allMembers.push({
                id: user.userId,
                username: user.username,
                rank: role.name,
                groupId,
                status: 'pending'
              })
            }
            
            cursor = memData.nextPageCursor || ''
            // Update progress of loading roster (visually)
            setProgress({ current: allMembers.length, total: allMembers.length })
          } while (cursor)
        }
      }
      
      setMembers(allMembers)
      setProgress({ current: 0, total: allMembers.length })
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingRoster(false)
    }
  }

  // Scanner loop
  useEffect(() => {
    if (!isScanning) return
    if (scanIndex >= members.length) {
      setIsScanning(false)
      return
    }
    
    if (stopScanRef.current) {
      setIsScanning(false)
      return
    }

    let isMounted = true

    const checkNext = async () => {
      const member = members[scanIndex]
      
      // Update status to checking
      setMembers(prev => prev.map((m, i) => i === scanIndex ? { ...m, status: 'checking' } : m))
      
      try {
        const res = await fetch(`/api/lookup/${member.id}`)
        const data = await res.json()
        
        if (isMounted) {
          const isFlagged = data.found && data.severity
          setMembers(prev => prev.map((m, i) => i === scanIndex ? { 
            ...m, 
            status: isFlagged ? 'flagged' : 'clean',
            result: data
          } : m))
          
          setProgress(p => ({ ...p, current: scanIndex + 1 }))
        }
      } catch (err) {
        if (isMounted) {
          setMembers(prev => prev.map((m, i) => i === scanIndex ? { ...m, status: 'clean' } : m))
          setProgress(p => ({ ...p, current: scanIndex + 1 }))
        }
      }
      
      if (isMounted && !stopScanRef.current) {
        // 1.5s delay to prevent rate limits
        setTimeout(() => {
          setScanIndex(prev => prev + 1)
        }, 1500)
      }
    }
    
    checkNext()
    
    return () => { isMounted = false }
  }, [isScanning, scanIndex, members.length])

  function toggleScan() {
    if (isScanning) {
      stopScanRef.current = true
      setIsScanning(false)
    } else {
      stopScanRef.current = false
      setIsScanning(true)
    }
  }

  function toggleRow(id: number) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const flaggedCount = members.filter(m => m.status === 'flagged').length
  const cleanCount = members.filter(m => m.status === 'clean').length

  // Auto-sort: Flagged first, then checking, then pending, then clean
  const sortedMembers = [...members].sort((a, b) => {
    const w = { flagged: 0, checking: 1, pending: 2, clean: 3 }
    if (w[a.status] !== w[b.status]) return w[a.status] - w[b.status]
    return a.username.localeCompare(b.username)
  })

  return (
    <>
      <Nav />
      <main className="min-h-screen grid-bg pt-20 px-4 pb-12">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-8 fade-up text-center">
            <h1 className="font-barlow font-700 text-4xl tracking-wide text-bright uppercase">
              CLAN <span className="text-crimson">SCANNER</span>
            </h1>
            <p className="font-mono text-sm text-steel mt-2">
              Select a target clan to dump roster and initiate global scan.
            </p>
          </div>

          {/* Clan Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 fade-up-2">
            {CLANS.map(clan => (
              <button
                key={clan.name}
                onClick={() => loadRoster(clan.name, clan.groups)}
                disabled={loadingRoster || isScanning}
                className={clsx(
                  "px-8 py-3 font-barlow font-700 tracking-widest transition-colors border",
                  activeClan === clan.name 
                    ? "bg-crimson text-white border-crimson" 
                    : "bg-[#0a0a0f] text-steel border-[#1e1e30] hover:border-crimson hover:text-bright disabled:opacity-50"
                )}
              >
                {clan.name}
              </button>
            ))}
          </div>

          {loadingRoster && (
            <div className="panel p-12 text-center fade-up">
              <Loader2 size={32} className="text-crimson animate-spin mx-auto mb-4" />
              <p className="font-mono text-sm text-steel">Fetching {activeClan} roster from Roblox API...</p>
              <p className="font-mono text-xs text-crimson mt-2">Loaded {progress.current} members</p>
            </div>
          )}

          {!loadingRoster && members.length > 0 && (
            <div className="panel fade-up border-[#1e1e30]">
              {/* Dashboard Bar */}
              <div className="p-4 border-b border-[#1e1e30] bg-[#0f0f1a] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="font-mono text-xs text-steel">TARGET</p>
                    <p className="font-barlow font-700 text-bright text-lg tracking-widest">{activeClan}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-steel">ROSTER SIZE</p>
                    <p className="font-barlow font-700 text-bright text-lg">{members.length}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-steel">FLAGGED</p>
                    <p className="font-barlow font-700 text-red-500 text-lg">{flaggedCount}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-steel">CLEAN</p>
                    <p className="font-barlow font-700 text-green-500 text-lg">{cleanCount}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono text-xs text-steel mb-1">SCAN PROGRESS</p>
                    <div className="w-48 h-2 bg-[#1e1e30] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-crimson transition-all duration-300"
                        style={{ width: `${(progress.current / members.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={toggleScan}
                    className={clsx(
                      "px-6 py-2.5 font-barlow font-700 tracking-widest text-white transition-colors flex items-center gap-2",
                      isScanning ? "bg-red-600 hover:bg-red-700" : "bg-crimson hover:bg-crimsonHot"
                    )}
                  >
                    {isScanning ? (
                      <>PAUSE SCAN</>
                    ) : (
                      <><Play size={14} fill="currentColor" /> {progress.current > 0 ? 'RESUME SCAN' : 'CHECK ALL'}</>
                    )}
                  </button>
                </div>
              </div>

              {/* Roster List */}
              <div className="divide-y divide-[#1e1e30]">
                {sortedMembers.slice(0, visibleCount).map((member, idx) => (
                  <div key={member.id} className="w-full">
                    <div 
                      onClick={() => member.status === 'flagged' && toggleRow(member.id)}
                      className={clsx(
                        "p-4 flex items-center justify-between transition-colors",
                        member.status === 'flagged' && "cursor-pointer hover:bg-[#1a1a24]",
                        member.status === 'checking' && "bg-[#1a1a24]"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className={clsx(
                          "w-12 h-12 flex-shrink-0 border flex items-center justify-center bg-[#0a0a0f] overflow-hidden transition-colors",
                          member.status === 'clean' ? 'border-green-800' :
                          member.status === 'flagged' ? 'border-red-600 glow-red' :
                          member.status === 'checking' ? 'border-yellow-500 animate-pulse' :
                          'border-[#1e1e30]'
                        )}>
                          <img 
                            src={`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${member.id}&size=150x150&format=Png&isCircular=false`}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        </div>

                        <div>
                          <a 
                            href={`https://www.roblox.com/users/${member.id}/profile`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-barlow font-700 text-lg text-bright hover:text-crimson transition-colors flex items-center gap-1.5"
                            onClick={e => e.stopPropagation()}
                          >
                            {member.username} <ExternalLink size={12} />
                          </a>
                          <p className="font-mono text-xs text-steel">{member.rank}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {member.status === 'checking' && (
                          <span className="flex items-center gap-2 font-mono text-xs text-yellow-500">
                            <Loader2 size={12} className="animate-spin" /> SCANNING
                          </span>
                        )}
                        {member.status === 'clean' && (
                          <span className="flex items-center gap-2 font-mono text-xs text-green-500">
                            <CheckCircle size={12} /> CLEAN
                          </span>
                        )}
                        {member.status === 'flagged' && (
                          <span className="flex items-center gap-2 font-mono text-xs font-bold text-red-500">
                            <AlertTriangle size={12} /> FLAGGED
                            {expandedRows.has(member.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expandable Details for Flagged */}
                    {member.status === 'flagged' && expandedRows.has(member.id) && member.result && (
                      <div className="bg-[#0a0a0f] p-6 border-t border-[#1e1e30]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <p className="font-mono text-xs text-steel mb-2">SEVERITY / CONFIDENCE</p>
                            <div className="flex gap-3">
                              <span className="px-3 py-1 bg-red-950 border border-red-800 text-red-500 font-mono text-xs uppercase">
                                {member.result.severity} RISK
                              </span>
                              <span className="px-3 py-1 bg-[#1e1e30] text-bright font-mono text-xs">
                                {member.result.confidence}% CONFIDENCE
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="font-mono text-xs text-steel mb-2">SOURCES</p>
                            <div className="flex gap-2">
                              {member.result.source?.includes('xtracker') && (
                                <span className="flex items-center gap-1 font-mono text-xs text-yellow-400 border border-yellow-900 bg-yellow-950 px-2 py-1">
                                  <Zap size={10} /> XTRACKER
                                </span>
                              )}
                              {member.result.source?.includes('manual') && (
                                <span className="flex items-center gap-1 font-mono text-xs text-steel border border-[#1e1e30] bg-[#0a0a0f] px-2 py-1">
                                  <Database size={10} /> CLAN REPORT
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {member.result.xtracker_entries && member.result.xtracker_entries.length > 0 && (
                          <div className="mt-6">
                            <p className="font-mono text-xs text-steel mb-2">XTRACKER LOGS</p>
                            <div className="space-y-2">
                              {member.result.xtracker_entries.map((e: any, i: number) => (
                                <div key={i} className="border border-[#1e1e30] p-3 text-sm font-rajdhani text-bright">
                                  <span className="text-crimson font-bold">{e.reason}</span> — {new Date(e.flagged_at).toLocaleDateString()}
                                  {e.evidence && (
                                    <a href={e.evidence} target="_blank" rel="noopener noreferrer" className="ml-3 text-xs font-mono text-steel hover:text-crimson transition-colors underline">
                                      [Evidence]
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {member.result.notes && (
                          <div className="mt-6">
                            <p className="font-mono text-xs text-steel mb-2">DATABASE NOTES</p>
                            <p className="font-rajdhani text-steel text-sm border-l-2 border-crimson pl-3">{member.result.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {visibleCount < members.length && (
                <div className="p-4 border-t border-[#1e1e30] text-center bg-[#0a0a0f]">
                  <button 
                    onClick={() => setVisibleCount(v => v + 100)}
                    className="font-mono text-xs text-steel hover:text-bright transition-colors"
                  >
                    LOAD MORE ({members.length - visibleCount} REMAINING)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
