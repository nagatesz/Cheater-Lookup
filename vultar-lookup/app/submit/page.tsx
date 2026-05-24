'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import { Shield, Send, CheckCircle, AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react'

const SEVERITY_OPTIONS = [
  { value: 'low',      label: 'LOW',      desc: 'Minor infraction, first offence' },
  { value: 'medium',   label: 'MEDIUM',   desc: 'Confirmed cheating or repeated offences' },
  { value: 'high',     label: 'HIGH',     desc: 'Severe cheating, ban evasion' },
  { value: 'critical', label: 'CRITICAL', desc: 'Extreme threat, hacking, doxxing, etc.' },
]

export default function SubmitPage() {
  const [form, setForm] = useState({
    discord_id: '',
    username: '',
    roblox_username: '',
    server_name: '',
    reason: '',
    severity: 'medium',
    submitted_by: '',
    notes: '',
  })
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function addEvidenceLink() {
    setEvidenceLinks(l => [...l, ''])
  }

  function updateLink(i: number, val: string) {
    setEvidenceLinks(l => l.map((v, idx) => idx === i ? val : v))
  }

  function removeLink(i: number) {
    setEvidenceLinks(l => l.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{17,20}$/.test(form.discord_id.trim())) {
      setError('Invalid Discord ID — must be 17–20 digits.')
      return
    }
    if (!form.reason.trim()) {
      setError('Reason is required.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          evidence_links: evidenceLinks.filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "search-input w-full px-4 py-2.5 text-sm"
  const labelClass = "block font-mono text-xs text-steel tracking-widest mb-1.5"

  if (success) return (
    <>
      <Nav />
      <main className="min-h-screen grid-bg pt-14 px-4 flex items-center justify-center">
        <div className="panel p-10 max-w-md w-full text-center corner-tl corner-br relative fade-up">
          <CheckCircle size={40} className="text-green-400 mx-auto mb-4" />
          <h2 className="font-barlow font-700 text-2xl text-bright tracking-wide mb-2">SUBMITTED</h2>
          <p className="text-steel font-barlow mb-6">Report received. It will be reviewed and added to the database.</p>
          <button onClick={() => { setSuccess(false); setForm({ discord_id:'',username:'',roblox_username:'',server_name:'',reason:'',severity:'medium',submitted_by:'',notes:'' }); setEvidenceLinks(['']) }}
            className="font-mono text-xs text-crimson border border-crimson px-4 py-2 hover:bg-crimson hover:text-white transition-colors">
            SUBMIT ANOTHER
          </button>
        </div>
      </main>
    </>
  )

  return (
    <>
      <Nav />
      <main className="min-h-screen grid-bg pt-14 px-4 pb-12">
        <div className="max-w-2xl mx-auto pt-12">
          <div className="mb-8 fade-up">
            <p className="font-mono text-xs text-steel tracking-widest mb-1">// CLAN REPORT SYSTEM</p>
            <h1 className="font-barlow font-700 text-4xl tracking-wide text-bright">
              SUBMIT <span className="text-crimson">CHEATER</span>
            </h1>
            <p className="text-steel font-barlow mt-2">
              Report a known cheater to add them to the Clanner Catch database. Only submit with evidence.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 fade-up-2">

            {/* Discord ID */}
            <div className="panel p-5">
              <label className={labelClass}>DISCORD ID *</label>
              <input className={inputClass} value={form.discord_id}
                onChange={e => set('discord_id', e.target.value)}
                placeholder="123456789012345678" maxLength={20} required />
              <p className="font-mono text-xs text-[#334155] mt-1">17–20 digit number. Right-click user → Copy ID in Discord.</p>
            </div>

            {/* User info */}
            <div className="panel p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>DISCORD USERNAME</label>
                <input className={inputClass} value={form.username}
                  onChange={e => set('username', e.target.value)} placeholder="username#0000" />
              </div>
              <div>
                <label className={labelClass}>ROBLOX USERNAME</label>
                <input className={inputClass} value={form.roblox_username}
                  onChange={e => set('roblox_username', e.target.value)} placeholder="RobloxUser123" />
              </div>
            </div>

            {/* Severity */}
            <div className="panel p-5">
              <label className={labelClass}>SEVERITY *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {SEVERITY_OPTIONS.map(opt => (
                  <button type="button" key={opt.value}
                    onClick={() => set('severity', opt.value)}
                    className={`p-3 border text-left transition-colors ${
                      form.severity === opt.value
                        ? opt.value === 'critical' ? 'border-[#ff3333] bg-red-950 text-[#ff3333]'
                          : opt.value === 'high' ? 'border-red-700 bg-red-950 text-red-400'
                          : opt.value === 'medium' ? 'border-yellow-700 bg-yellow-950 text-yellow-400'
                          : 'border-green-700 bg-green-950 text-green-400'
                        : 'border-[#1e1e30] hover:border-[#2a2a40] text-steel'
                    }`}>
                    <div className="font-mono font-700 text-xs tracking-widest">{opt.label}</div>
                    <div className="font-barlow text-xs mt-0.5 opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Server + reason */}
            <div className="panel p-5 space-y-4">
              <div>
                <label className={labelClass}>SERVER WHERE CAUGHT</label>
                <input className={inputClass} value={form.server_name}
                  onChange={e => set('server_name', e.target.value)} placeholder="Server name" />
              </div>
              <div>
                <label className={labelClass}>REASON / OFFENCE *</label>
                <textarea className={`${inputClass} resize-none h-24`} value={form.reason}
                  onChange={e => set('reason', e.target.value)}
                  placeholder="Describe what this user did..." required />
              </div>
              <div>
                <label className={labelClass}>ADDITIONAL NOTES</label>
                <textarea className={`${inputClass} resize-none h-20`} value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Aliases, alt accounts, other context..." />
              </div>
            </div>

            {/* Evidence links */}
            <div className="panel p-5">
              <label className={labelClass}>EVIDENCE LINKS</label>
              <div className="space-y-2">
                {evidenceLinks.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <input className={`${inputClass} flex-1`} value={link}
                      onChange={e => updateLink(i, e.target.value)}
                      placeholder="https://imgur.com/..." type="url" />
                    {evidenceLinks.length > 1 && (
                      <button type="button" onClick={() => removeLink(i)}
                        className="border border-[#1e1e30] px-3 text-steel hover:text-red-400 hover:border-red-800 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addEvidenceLink}
                  className="flex items-center gap-1.5 font-mono text-xs text-steel hover:text-bright transition-colors mt-1">
                  <Plus size={11} /> Add another link
                </button>
              </div>
            </div>

            {/* Submitted by */}
            <div className="panel p-5">
              <label className={labelClass}>YOUR DISCORD TAG (optional)</label>
              <input className={inputClass} value={form.submitted_by}
                onChange={e => set('submitted_by', e.target.value)} placeholder="yourname#0000" />
            </div>

            {error && (
              <p className="text-red-400 font-mono text-xs flex items-center gap-1">
                <AlertTriangle size={11} /> {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-crimson hover:bg-crimsonHot disabled:opacity-50 transition-colors py-3 text-white font-barlow font-700 tracking-widest text-base flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {loading ? 'SUBMITTING...' : 'SUBMIT REPORT'}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
