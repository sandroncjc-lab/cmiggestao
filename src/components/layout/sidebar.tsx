'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  HardHat,
  Users,
  FileText,
  ClipboardList,
  Timer,
  Wrench,
  ShieldCheck,
  FolderOpen,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react'

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'engenheiro', 'encarregado', 'aprovador_cliente'] },
  { href: '/obras', label: 'Obras', icon: HardHat, roles: ['admin', 'engenheiro', 'encarregado', 'aprovador_cliente'] },
  { href: '/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'engenheiro'] },
  { href: '/contratos', label: 'Contratos', icon: FileText, roles: ['admin', 'engenheiro'] },
  { href: '/rdo', label: 'RDO', icon: ClipboardList, roles: ['admin', 'engenheiro', 'encarregado', 'aprovador_cliente'] },
  { href: '/hh', label: 'Homem Hora', icon: Timer, roles: ['admin', 'engenheiro', 'encarregado', 'aprovador_cliente'] },
  { href: '/equipamentos', label: 'Equipamentos', icon: Wrench, roles: ['admin', 'engenheiro', 'encarregado'] },
  { href: '/epis', label: 'EPIs', icon: ShieldCheck, roles: ['admin', 'engenheiro', 'encarregado'] },
  { href: '/documentos', label: 'Documentos', icon: FolderOpen, roles: ['admin', 'engenheiro', 'encarregado', 'aprovador_cliente'] },
  { href: '/usuarios', label: 'Usuários', icon: UserCog, roles: ['admin'] },
]

interface SidebarProps {
  funcao?: string
}

export function Sidebar({ funcao = 'admin' }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const navItems = allNavItems.filter((item) => item.roles.includes(funcao))

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <Building2 className="h-6 w-6 shrink-0 text-sidebar-primary" />
        {!collapsed && (
          <span className="font-semibold text-sm truncate">CMIG Gestão</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    collapsed && 'justify-center px-2',
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  )
}
