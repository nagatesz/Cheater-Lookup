'use client'
import { useState, useRef, useCallback } from 'react'
import Nav from '@/components/Nav'
import { Shield, Loader2, Play, AlertTriangle, CheckCircle, Database, Zap, ExternalLink, ChevronDown, ChevronUp, X, Pause } from 'lucide-react'
import clsx from 'clsx'

const CLANS = [
  { name: 'VULTAR', groups: [
    { id: 35685173, label: 'Imperium of Vultar', priority: 1 },
    { id: 35685159, label: 'Vultarian Initiate Academy', priority: 2 },
  ]},
  { name: 'SOL', groups: [
    { id: 2764561, label: 'Sol Imperialis', priority: 1 },
  ]},
  { name: 'SURGE', groups: [
    { id: 12434378, label: 'Insurgent Ascension Program', priority: 1 },
  ]},
]

type Member = {
  id: number
  username: string
  rank: string
  groupId: number
  groupPriority: number
  status: 'pending' | 'checking' | 'clean' | 'flagged'
  result?: any
}

export default function GroupsPage() {
  const [activeClan, setActiveClan] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)

  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 })

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarDetail, setSidebarDetail] = useState<Member | null>(null)

  const stopRef = useRef(false)
  const membersRef = useRef<Member[]>([])

  // Keep membersRef in sync
  const updateMembers = useCallback((updater: (prev: Member[]) => Member[]) => {
    setMembers(prev => {
      const next = updater(prev)
      membersRef.current = next
      return next
    })
  }, [])

  async function loadRoster(clanName: string, groups: { id: number; label: string; priority: number }[]) {
    setActiveClan(clanName)
    setLoadingRoster(true)
    setMembers([])
    membersRef.current = []
    setIsScanning(false)
    setScanProgress({ current: 0, total: 0 })
    setLoadedCount(0)
    setSidebarOpen(false)
    setSidebarDetail(null)
    stopRef.current = true

    try {
      // Collect all members from all groups with priority info
      const rawMembers: Member[] = []

      for (const group of groups) {
        const roleRes = await fetch(`/api/roblox/group-roles?groupId=${group.id}`)
        if (!roleRes.ok) continue
        const roleData = await roleRes.json()

        for (const role of roleData.roles) {
          let cursor = ''
          do {
            const memRes = await fetch(`/api/roblox/group-members?groupId=${group.id}&roleId=${role.id}&cursor=${cursor}`)
            if (!memRes.ok) break
            const memData = await memRes.json()

            for (const user of memData.data) {
              rawMembers.push({
                id: user.userId,
                username: user.username,
                rank: role.name,
                groupId: group.id,
                groupPriority: group.priority,
                status: 'pending',
              })
            }

            setLoadedCount(rawMembers.length)
            cursor = memData.nextPageCursor || ''
          } while (cursor)
        }
      }

      // Deduplicate: keep highest priority (lowest number) entry per user
      const userMap = new Map<number, Member>()
      for (const m of rawMembers) {
        const existing = userMap.get(m.id)
        if (!existing || m.groupPriority < existing.groupPriority) {
          userMap.set(m.id, m)
        }
      }

      const dedupedMembers = Array.from(userMap.values())
      membersRef.current = dedupedMembers
      setMembers(dedupedMembers)
      setScanProgress({ current: 0, total: dedupedMembers.length })
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingRoster(false)
    }
  }

  async function startScan() {
    stopRef.current = false
    setIsScanning(true)

    const currentMembers = membersRef.current
    // Find the first unchecked member to resume from
    let startIdx = currentMembers.findIndex(m => m.status === 'pending')
    if (startIdx === -1) {
      setIsScanning(false)
      return
    }

    for (let i = startIdx; i < currentMembers.length; i++) {
      if (stopRef.current) break

      const member = membersRef.current[i]
      if (member.status !== 'pending') continue

      // Mark as checking
      updateMembers(prev => prev.map((m, idx) => idx === i ? { ...m, status: 'checking' } : m))

      try {
        const res = await fetch(`/api/lookup/${member.id}`)
        const data = await res.json()
        const isFlagged = data.found && data.severity

        updateMembers(prev => prev.map((m, idx) => idx === i ? {
          ...m,
          status: isFlagged ? 'flagged' : 'clean',
          result: data,
        } : m))
      } catch {
        updateMembers(prev => prev.map((m, idx) => idx === i ? { ...m, status: 'clean' } : m))
      }

      setScanProgress(p => ({ ...p, current: i + 1 }))

      // 1.5s delay for rate limiting
      if (!stopRef.current && i < currentMembers.length - 1) {
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    setIsScanning(false)
  }

  function pauseScan() {
    stopRef.current = true
    setIsScanning(false)
  }

  const flaggedMembers = members.filter(m => m.status === 'flagged')
  const flaggedCount = flaggedMembers.length
  const cleanCount = members.filter(m => m.status === 'clean').length
  const checkedCount = members.filter(m => m.status !== 'pending').length

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

          {/* Loading roster */}
          {loadingRoster && (
            <div className="panel p-12 text-center fade-up">
              <Loader2 size={32} className="text-crimson animate-spin mx-auto mb-4" />
              <p className="font-mono text-sm text-steel">Fetching {activeClan} roster from Roblox API...</p>
              <p className="font-mono text-xs text-crimson mt-2">Loaded {loadedCount} members</p>
            </div>
          )}

          {/* Main content area */}
          {!loadingRoster && members.length > 0 && (
            <div className="flex gap-0 relative">

              {/* Main roster panel */}
              <div className={clsx("panel fade-up border-[#1e1e30] transition-all", sidebarOpen ? "w-[calc(100%-360px)]" : "w-full")}>

                {/* Dashboard Bar */}
                <div className="p-4 border-b border-[#1e1e30] bg-[#0f0f1a] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="font-mono text-xs text-steel">TARGET</p>
                      <p className="font-barlow font-700 text-bright text-lg tracking-widest">{activeClan}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-steel">ROSTER</p>
                      <p className="font-barlow font-700 text-bright text-lg">{members.length}</p>
                    </div>
                    <div
                      onClick={() => flaggedCount > 0 && setSidebarOpen(!sidebarOpen)}
                      className={clsx("cursor-pointer transition-colors", flaggedCount > 0 && "hover:opacity-80")}
                    >
                      <p className="font-mono text-xs text-steel">FLAGGED</p>
                      <p className={clsx("font-barlow font-700 text-lg", flaggedCount > 0 ? "text-red-500 underline decoration-dotted" : "text-red-500")}>
                        {flaggedCount}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-steel">CLEAN</p>
                      <p className="font-barlow font-700 text-green-500 text-lg">{cleanCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono text-xs text-steel mb-1">
                        {checkedCount}/{members.length} SCANNED
                      </p>
                      <div className="w-48 h-2 bg-[#1e1e30] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-crimson transition-all duration-300"
                          style={{ width: `${members.length > 0 ? (checkedCount / members.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={isScanning ? pauseScan : startScan}
                      disabled={loadingRoster}
                      className={clsx(
                        "px-6 py-2.5 font-barlow font-700 tracking-widest text-white transition-colors flex items-center gap-2",
                        isScanning ? "bg-red-600 hover:bg-red-700" : "bg-crimson hover:bg-crimsonHot"
                      )}
                    >
                      {isScanning ? (
                        <><Pause size={14} /> PAUSE</>
                      ) : (
                        <><Play size={14} fill="currentColor" /> {checkedCount > 0 ? 'RESUME' : 'CHECK ALL'}</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Roster List — never sorted, always in original order */}
                <div className="divide-y divide-[#1e1e30] max-h-[70vh] overflow-y-auto">
                  {members.map((member) => (
                    <div key={member.id}>
                      <div
                        className={clsx(
                          "p-3 flex items-center justify-between transition-all duration-300",
                          member.status === 'checking' && "bg-[#1a1a24]",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar with colored border */}
                          <div className={clsx(
                            "w-10 h-10 flex-shrink-0 border-2 flex items-center justify-center bg-[#0a0a0f] overflow-hidden transition-all duration-500",
                            member.status === 'clean' && 'border-green-600',
                            member.status === 'flagged' && 'border-red-500 shadow-[0_0_12px_rgba(255,0,0,0.4)]',
                            member.status === 'checking' && 'border-yellow-500 animate-pulse',
                            member.status === 'pending' && 'border-[#1e1e30]',
                          )}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${member.id}&size=150x150&format=Png&isCircular=false`}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                          </div>

                          <div>
                            <a
                              href={`https://www.roblox.com/users/${member.id}/profile`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-barlow font-700 text-sm text-bright hover:text-crimson transition-colors inline-flex items-center gap-1"
                            >
                              {member.username} <ExternalLink size={10} />
                            </a>
                            <p className="font-mono text-[10px] text-steel">{member.rank}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {member.status === 'checking' && (
                            <span className="flex items-center gap-1.5 font-mono text-[10px] text-yellow-500">
                              <Loader2 size={10} className="animate-spin" /> SCANNING
                            </span>
                          )}
                          {member.status === 'clean' && (
                            <span className="flex items-center gap-1.5 font-mono text-[10px] text-green-500">
                              <CheckCircle size={10} /> CLEAN
                            </span>
                          )}
                          {member.status === 'flagged' && (
                            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-red-500">
                              <AlertTriangle size={10} /> FLAGGED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flagged Players Sidebar */}
              {sidebarOpen && (
                <div className="w-[360px] flex-shrink-0 border border-[#1e1e30] bg-[#0a0a0f] ml-[-1px] flex flex-col max-h-[calc(70vh+72px)]">
                  {/* Sidebar Header */}
                  <div className="p-4 border-b border-[#1e1e30] bg-[#0f0f1a] flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-500" />
                      <span className="font-barlow font-700 text-sm text-red-500 tracking-widest">
                        FLAGGED ({flaggedCount})
                      </span>
                    </div>
                    <button onClick={() => { setSidebarOpen(false); setSidebarDetail(null) }} className="text-steel hover:text-bright">
                      <X size={16} />
                    </button>
                  </div>

                  {/* Flagged list */}
                  <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e30]">
                    {flaggedMembers.map(member => (
                      <div key={member.id}>
                        <button
                          onClick={() => setSidebarDetail(sidebarDetail?.id === member.id ? null : member)}
                          className={clsx(
                            "w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-[#111119]",
                            sidebarDetail?.id === member.id && "bg-[#111119]"
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${member.id}&size=150x150&format=Png&isCircular=false`}
                            alt=""
                            className="w-9 h-9 border border-red-800 bg-[#0a0a0f] flex-shrink-0"
                            loading="lazy"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-barlow font-700 text-sm text-bright truncate">{member.username}</p>
                            <p className="font-mono text-[10px] text-steel truncate">{member.rank}</p>
                          </div>
                          {sidebarDetail?.id === member.id ? <ChevronUp size={14} className="text-steel flex-shrink-0" /> : <ChevronDown size={14} className="text-steel flex-shrink-0" />}
                        </button>

                        {/* Expanded detail panel */}
                        {sidebarDetail?.id === member.id && member.result && (
                          <div className="bg-[#08080d] border-t border-[#1e1e30] p-4 space-y-4">
                            {/* Profile link */}
                            <a
                              href={`https://www.roblox.com/users/${member.id}/profile`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-crimson hover:text-crimsonHot flex items-center gap-1"
                            >
                              <ExternalLink size={10} /> View Roblox Profile
                            </a>

                            {/* Severity + Confidence */}
                            <div className="flex gap-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-red-950 border border-red-800 text-red-400 font-mono text-[10px] uppercase">
                                {member.result.severity} RISK
                              </span>
                              <span className="px-2 py-0.5 bg-[#1e1e30] text-bright font-mono text-[10px]">
                                {member.result.confidence}% CONF
                              </span>
                            </div>

                            {/* Sources */}
                            <div className="flex gap-2">
                              {member.result.source?.includes('xtracker') && (
                                <span className="flex items-center gap-1 font-mono text-[10px] text-yellow-400 border border-yellow-900 bg-yellow-950 px-1.5 py-0.5">
                                  <Zap size={8} /> XTRACKER
                                </span>
                              )}
                              {member.result.source?.includes('manual') && (
                                <span className="flex items-center gap-1 font-mono text-[10px] text-steel border border-[#1e1e30] bg-[#0a0a0f] px-1.5 py-0.5">
                                  <Database size={8} /> DB
                                </span>
                              )}
                            </div>

                            {/* XTracker Logs */}
                            {member.result.xtracker_entries && member.result.xtracker_entries.length > 0 && (
                              <div>
                                <p className="font-mono text-[10px] text-steel mb-1.5 tracking-wider">XTRACKER LOGS</p>
                                <div className="space-y-1.5">
                                  {member.result.xtracker_entries.map((e: any, i: number) => (
                                    <div key={i} className="border border-[#1e1e30] p-2 text-xs">
                                      <span className="text-crimson font-bold font-rajdhani">{e.reason}</span>
                                      <span className="text-steel font-mono text-[10px] ml-2">
                                        {new Date(e.flagged_at).toLocaleDateString()}
                                      </span>
                                      {e.evidence && (
                                        <a
                                          href={e.evidence}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block mt-1 text-[10px] font-mono text-steel hover:text-crimson underline"
                                        >
                                          [View Evidence]
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Notes from DB */}
                            {member.result.notes && (
                              <div>
                                <p className="font-mono text-[10px] text-steel mb-1 tracking-wider">NOTES</p>
                                <p className="font-rajdhani text-xs text-steel border-l-2 border-crimson pl-2">
                                  {member.result.notes}
                                </p>
                              </div>
                            )}

                            {/* Servers */}
                            {member.result.servers && member.result.servers.length > 0 && (
                              <div>
                                <p className="font-mono text-[10px] text-steel mb-1 tracking-wider">SERVERS</p>
                                <div className="flex flex-wrap gap-1">
                                  {member.result.servers.map((s: string) => (
                                    <span key={s} className="font-mono text-[10px] border border-[#1e1e30] bg-[#0f0f1a] px-1.5 py-0.5 text-steel">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {flaggedMembers.length === 0 && (
                      <div className="p-8 text-center">
                        <p className="font-mono text-xs text-steel">No flagged players yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
