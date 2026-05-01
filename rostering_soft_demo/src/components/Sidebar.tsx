'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types';
import {
  LayoutDashboard,
  Building2,
  Users2,
  UserPlus2,
  ClipboardList,
  Send,
  UserCircle2,
  FolderTree,
  Settings2,
  X,
  CalendarClock,
  Shield,
  FileText,
  BarChart3,
} from 'lucide-react';

interface NavSection {
  title: string;
  links: {
    href: string;
    label: string;
    icon: React.ReactNode;
    roles?: UserRole[];
  }[];
}

const navSections: NavSection[] = [
  {
    title: 'Operations',
    links: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
      },
    ],
  },
  {
    title: 'Configuration',
    links: [
      {
        href: '/departments',
        label: 'Departments',
        icon: <Building2 className="w-5 h-5" />,
        roles: ['system_admin', 'roster_planner'] as UserRole[],
      },
      {
        href: '/designations',
        label: 'Designations',
        icon: <UserCircle2 className="w-5 h-5" />,
        roles: ['system_admin', 'roster_planner'] as UserRole[],
      },
      {
        href: '/roster-groups',
        label: 'Roster Groups',
        icon: <FolderTree className="w-5 h-5" />,
        roles: ['system_admin', 'roster_planner'] as UserRole[],
      },
      {
        href: '/duty-types',
        label: 'Duty Types',
        icon: <Settings2 className="w-5 h-5" />,
        roles: ['system_admin', 'roster_planner'] as UserRole[],
      },
    ],
  },
  {
    title: 'Personnel',
    links: [
      {
        href: '/employees',
        label: 'Employees',
        icon: <UserPlus2 className="w-5 h-5" />,
        roles: ['system_admin', 'roster_planner'] as UserRole[],
      },
      {
        href: '/users',
        label: 'Staff Directory',
        icon: <Users2 className="w-5 h-5" />,
        roles: ['system_admin', 'roster_planner'] as UserRole[],
      },
      {
        href: '/delegations',
        label: 'Planner Rights',
        icon: <Shield className="w-5 h-5" />,
        roles: ['system_admin'] as UserRole[],
      },
    ],
  },
  {
    title: 'System',
    links: [
      {
        href: '/audit-logs',
        label: 'Audit Logs',
        icon: <FileText className="w-5 h-5" />,
        roles: ['system_admin'] as UserRole[],
      },
    ],
  },
  {
    title: 'Scheduling',
    links: [
      {
        href: '/duties',
        label: 'Duty Management',
        icon: <ClipboardList className="w-5 h-5" />,
        roles: ['system_admin', 'roster_planner'] as UserRole[],
      },
      {
        href: '/dispatch',
        label: 'Roster Dispatch',
        icon: <Send className="w-5 h-5" />,
        roles: ['system_admin', 'roster_planner'] as UserRole[],
      },
      {
        href: '/reports',
        label: 'Reports',
        icon: <BarChart3 className="w-5 h-5" />,
        roles: ['system_admin', 'roster_planner', 'manager'] as UserRole[],
      },
    ],
  },
  {
    title: 'Employee Portal',
    links: [
      {
        href: '/employee-requests',
        label: 'Leave & Duty Management',
        icon: <CalendarClock className="w-5 h-5" />,
        roles: ['employee'] as UserRole[],
      },
    ],
  },
];

interface SidebarProps {
  role?: UserRole;
  isCollapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarContent({ role, isCollapsed, onLinkClick }: { role?: UserRole; isCollapsed?: boolean; onLinkClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className={`py-6 space-y-6 ${isCollapsed ? 'px-3' : 'px-6'}`}>
      {navSections.map((section) => {
        const visibleLinks = section.links.filter(
          (link) => !link.roles || (role && link.roles.includes(role))
        );
        if (visibleLinks.length === 0) return null;

        return (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-4">
                {section.title}
              </h3>
            )}
            <nav className="space-y-1">
              {visibleLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={isCollapsed ? link.label : ''}
                    onClick={onLinkClick}
                    className={`flex items-center rounded-xl text-sm font-bold transition-all group relative ${
                      isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
                    } ${
                      active
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-slate-600 hover:text-primary hover:bg-accent'
                    }`}
                  >
                    <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-primary transition-colors flex-shrink-0'}`}>
                      {link.icon}
                    </span>
                    {!isCollapsed && <span className="truncate">{link.label}</span>}

                    {active && isCollapsed && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        );
      })}

      {!isCollapsed && (
        <div className="pt-6 border-t border-border mt-auto">
          <div className="bg-slate-50 border border-border rounded-2xl p-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">RosterPro Management</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Integrated Roster Planning System v2.1.0
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ role, isCollapsed, mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-white border-r border-border z-20 hidden lg:block overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent role={role} isCollapsed={isCollapsed} />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer panel */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-white border-r border-border z-50 lg:hidden overflow-y-auto transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary flex items-center justify-center text-white font-black text-base rounded-sm shadow-md">
              RP
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">RosterPro</span>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent role={role} isCollapsed={false} onLinkClick={onMobileClose} />
      </aside>
    </>
  );
}
