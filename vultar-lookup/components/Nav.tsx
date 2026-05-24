'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Search, Plus, Home } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { href: '/', label: 'HOME', icon: Home },
  { href: '/lookup', label: 'LOOKUP', icon: Search },
  { href: '/groups', label: 'CLAN SCANNER', icon: Shield },
  { href: '/submit', label: 'SUBMIT', icon: Plus },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e1e30] bg-[#08080dee] backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 border border-crimson flex items-center justify-center glow-red">
            <Shield size={14} className="text-crimson" />
          </div>
          <span className="font-barlow font-700 text-lg tracking-widest text-bright group-hover:text-crimson transition-colors">
            VULTAR<span className="text-crimson mx-1">·</span>LOOKUP
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== '/' && path.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-mono tracking-wider transition-all',
                  active
                    ? 'text-crimson border-b-2 border-crimson pb-[5px]'
                    : 'text-steel hover:text-bright'
                )}
              >
                <Icon size={12} />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-steel">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 blink" />
          ONLINE
        </div>
      </div>
    </nav>
  )
}
