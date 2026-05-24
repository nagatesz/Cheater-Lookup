import Nav from '@/components/Nav'
import Link from 'next/link'
import { Search, Shield, Database, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen grid-bg pt-14 flex flex-col items-center justify-center px-4">
        <div className="scanlines fixed inset-0 pointer-events-none" />

        {/* Hero */}
        <div className="text-center max-w-2xl fade-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-[#1e1e30] bg-[#0f0f1a] px-3 py-1 text-xs font-mono text-steel mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-crimson blink" />
            VULTAR OF IMPERIUM — ANTI-CHEAT DIVISION
          </div>

          {/* Title */}
          <h1 className="font-barlow font-700 text-6xl md:text-8xl tracking-tight mb-2 leading-none">
            <span className="text-bright">CHEATER</span>
            <br />
            <span className="text-crimson glow-red-text">LOOKUP</span>
          </h1>
          <p className="text-steel font-mono text-sm mt-6 mb-10 leading-relaxed">
            Search Discord IDs against the Vultar database &amp; XTracker<br />
            to identify known cheaters and rule-breakers.
          </p>

          {/* Quick Search */}
          <div className="relative max-w-md mx-auto mb-12 fade-up-2">
            <form action="/lookup" method="get" className="flex gap-2">
              <input
                name="id"
                type="text"
                placeholder="Enter Discord ID..."
                className="search-input flex-1 px-4 py-3 text-sm rounded-none"
                pattern="[0-9]{17,20}"
                title="Enter a valid Discord ID (17-20 digits)"
              />
              <button
                type="submit"
                className="bg-crimson hover:bg-crimsonHot transition-colors px-5 py-3 text-white font-barlow font-600 tracking-widest text-sm flex items-center gap-2"
              >
                <Search size={14} />
                SEARCH
              </button>
            </form>
            <p className="text-xs text-[#334155] font-mono mt-2 text-left">
              Discord IDs are 17–20 digit numbers. Right-click user → Copy ID in Discord.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 fade-up-3">
            {[
              { icon: Database, label: 'DATABASE', value: 'LIVE' },
              { icon: Zap, label: 'XTRACKER', value: 'SYNCED' },
              { icon: Shield, label: 'CLAN', value: 'PROTECTED' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon size={16} className="text-crimson mx-auto mb-1" />
                <div className="font-mono text-xs text-steel">{label}</div>
                <div className="font-barlow font-700 text-bright tracking-wider">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full mt-16 fade-up-4 px-4">
          <Link href="/lookup" className="panel p-6 corner-tl corner-br relative hover:border-crimson transition-colors group">
            <Search size={20} className="text-crimson mb-3" />
            <h3 className="font-barlow font-700 text-lg tracking-wide text-bright group-hover:text-crimson transition-colors">
              LOOKUP A USER
            </h3>
            <p className="text-steel text-sm mt-1 font-rajdhani">
              Search a Discord ID against our database and XTracker logs.
            </p>
          </Link>
          <Link href="/submit" className="panel p-6 corner-tl corner-br relative hover:border-crimson transition-colors group">
            <Shield size={20} className="text-crimson mb-3" />
            <h3 className="font-barlow font-700 text-lg tracking-wide text-bright group-hover:text-crimson transition-colors">
              SUBMIT A CHEATER
            </h3>
            <p className="text-steel text-sm mt-1 font-rajdhani">
              Report a known cheater to add them to the clan database.
            </p>
          </Link>
        </div>

        <p className="text-[#1e1e30] font-mono text-xs mt-16 fade-up-4">
          VULTAR OF IMPERIUM © {new Date().getFullYear()} — DATA FROM XTRACKER + CLAN REPORTS
        </p>
      </main>
    </>
  )
}
