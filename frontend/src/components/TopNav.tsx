import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpen,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Eye,
  FileSearch,
  FlaskConical,
  GitCompareArrows,
  LayoutDashboard,
  Plug,
  Rocket,
  Settings,
  Sparkles,
  Sun,
  TestTube2,
  Wrench,
  Database,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { toolsGroupLabel } from '../constants/app'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

type NavGroup = {
  label: string
  icon: LucideIcon
  items: NavItem[]
}

const buildPmGroup = (displayName: string): NavGroup => ({
  label: toolsGroupLabel(displayName),
  icon: Wrench,
  items: [
    { to: '/pm', label: 'Overview', icon: Wrench, end: true },
    { to: '/pm/standup', label: 'Standup', icon: Sun },
    { to: '/pm/prd-checker', label: 'PRD Checker', icon: FileSearch },
    { to: '/pm/change-impact', label: 'Change Impact', icon: GitCompareArrows },
  ],
})

const QA_GROUP: NavGroup = {
  label: 'QA Tools',
  icon: FlaskConical,
  items: [
    { to: '/qa', label: 'Overview', icon: FlaskConical, end: true },
    { to: '/qa/regression', label: 'Regression', icon: TestTube2 },
    { to: '/qa/api-qa', label: 'API QA', icon: ClipboardCheck },
    { to: '/qa/visual-qa', label: 'Visual QA', icon: Eye },
    { to: '/qa/smart-test-data', label: 'Smart Test Data', icon: Database },
    { to: '/qa/release-readiness', label: 'Release Readiness', icon: Rocket },
  ],
}

const KNOWLEDGE_GROUP: NavGroup = {
  label: 'Knowledge',
  icon: BookOpen,
  items: [
    { to: '/knowledge', label: 'Library', icon: BookOpen, end: true },
    { to: '/knowledge/ask', label: 'Ask Product', icon: CircleHelp },
  ],
}

const STANDALONE_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/integrations', label: 'Integrations', icon: Plug },
  { to: '/settings', label: 'Settings', icon: Settings },
]

type TopNavProps = {
  displayName: string
}

const navLinkClass = (isActive: boolean) =>
  [
    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200',
    isActive
      ? 'bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-200'
      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)] hover:shadow-sm',
  ].join(' ')

type MenuPosition = {
  top: number
  left: number
}

const NavDropdown = ({ group }: { group: NavGroup }) => {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const GroupIcon = group.icon
  const isChildActive = group.items.some((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )

  const updateMenuPosition = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 6, left: rect.left })
  }

  useEffect(() => {
    if (!open) return

    updateMenuPosition()

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target)) return
      const menu = document.getElementById(`nav-menu-${group.label}`)
      if (menu?.contains(target)) return
      setOpen(false)
    }

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const handleScroll = () => updateMenuPosition()

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleScroll)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleScroll)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open, group.label])

  const handleToggle = () => {
    if (!open) updateMenuPosition()
    setOpen((prev) => !prev)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }
  }

  const menu = open && menuPos
    ? createPortal(
        <div
          id={`nav-menu-${group.label}`}
          className="min-w-[220px] rounded-xl border border-[var(--color-border)] bg-white py-1.5 shadow-xl shadow-violet-100/40"
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          role="menu"
        >
          {group.items.map((item) => {
            const ItemIcon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    'mx-1.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-violet-50 font-medium text-violet-700'
                      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
                  ].join(' ')
                }
              >
                <ItemIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                {item.label}
              </NavLink>
            )
          })}
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={[
          'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200',
          open || isChildActive
            ? 'bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-200'
            : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)] hover:shadow-sm',
        ].join(' ')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${group.label} menu`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <GroupIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <span>{group.label}</span>
        <ChevronDown
          className={['h-4 w-4 shrink-0 opacity-50 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
          aria-hidden
        />
      </button>
      {menu}
    </>
  )
}

export const TopNav = ({ displayName }: TopNavProps) => {
  const pmGroup = buildPmGroup(displayName)

  return (
    <header className="sticky top-0 z-40 overflow-visible border-b border-[var(--color-border)] bg-white/90 backdrop-blur-xl">
      <div
        className="h-0.5 w-full bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-400"
        aria-hidden
      />

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 md:gap-x-6 md:px-6">
        <NavLink
          to="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="PMQA Copilot home"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-300/40 transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-white animate-pulse-soft" aria-hidden />
          </div>
          <span className="text-sm font-bold tracking-tight text-[var(--color-ink)]">
            PMQA <span className="font-normal text-violet-600">Copilot</span>
          </span>
        </NavLink>

        <nav className="flex flex-1 flex-wrap items-center gap-0.5" aria-label="Primary navigation">
          <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
            <span>Dashboard</span>
          </NavLink>

          <NavDropdown group={pmGroup} />
          <NavDropdown group={QA_GROUP} />
          <NavDropdown group={KNOWLEDGE_GROUP} />

          {STANDALONE_NAV.slice(1).map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => navLinkClass(isActive)}>
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-600 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse-soft" aria-hidden />
            Local
          </span>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white shadow-md ring-2 ring-violet-100 transition-transform hover:scale-105"
            title={displayName}
            aria-label={`Signed in as ${displayName}`}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
