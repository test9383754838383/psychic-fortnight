import React, { useState } from "react";
import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useCurrentUser } from "../../auth/AuthContext";

const MODULE_NAMES: Record<string, string> = {
  "/schedule": "Vessel Schedule",
  "/voyages": "Voyages",
  "/tasks": "Tasks",
  "/alerts": "Alerts",
  "/forms": "Forms",
};

function IconSchedule() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconPortCalls() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconVoyages() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function IconTasks() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconAlerts() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconForms() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconBunkers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22h18" /><path d="M6 22V11l6-9 6 9v11" /><path d="M10 22v-5h4v5" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconAnchor() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" /><line x1="12" y1="8" x2="12" y2="21" /><path d="M5 18H2a10 10 0 0 0 20 0h-3" />
    </svg>
  );
}

interface NavItem {
  label: string;
  Icon: () => React.ReactElement;
  to: string;
  matchPrefix: string;
  disabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Vessel Schedule", Icon: IconSchedule,  to: "/schedule", matchPrefix: "/schedule", disabled: false },
  { label: "Port Calls",      Icon: IconPortCalls, to: "/schedule", matchPrefix: "/__never__", disabled: true  },
  { label: "Voyages",         Icon: IconVoyages,   to: "/voyages",  matchPrefix: "/voyages",   disabled: false },
  { label: "Tasks",           Icon: IconTasks,     to: "/tasks",    matchPrefix: "/tasks",     disabled: false },
  { label: "Alerts",          Icon: IconAlerts,    to: "/alerts",   matchPrefix: "/alerts",    disabled: false },
  { label: "Forms",           Icon: IconForms,     to: "/forms",    matchPrefix: "/forms",     disabled: false },
  { label: "Bunkers",         Icon: IconBunkers,   to: "/tasks",    matchPrefix: "/__never__", disabled: true  },
];

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, signOut } = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  function isActive(item: NavItem): boolean {
    if (item.disabled) return false;
    return pathname.startsWith(item.matchPrefix);
  }

  function getModuleName(): string {
    const exact = MODULE_NAMES[pathname];
    if (exact) return exact;
    if (pathname.startsWith("/voyages/")) {
      if (pathname.endsWith("/workspace")) return "Voyage Workspace";
      return "Voyage Manager";
    }
    return "Operations";
  }

  return (
    <div className="shell-frame">
      <aside className={`shell-sidebar${collapsed ? " shell-sidebar--collapsed" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <IconAnchor />
          </div>
          {!collapsed && <span className="sidebar-brand-name">Operations</span>}
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const { Icon } = item;
            if (item.disabled) {
              return (
                <span
                  key={item.label}
                  className="sidebar-nav-item sidebar-nav-item--disabled"
                  aria-disabled="true"
                  title={collapsed ? item.label : undefined}
                >
                  <span className="nav-item-icon"><Icon /></span>
                  {!collapsed && <span className="nav-item-label">{item.label}</span>}
                </span>
              );
            }
            const active = isActive(item);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`sidebar-nav-item${active ? " sidebar-nav-item--active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-item-icon"><Icon /></span>
                {!collapsed && <span className="nav-item-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          type="button"
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <div className="topbar-left">
            <span className="topbar-module-name">{getModuleName()}</span>
          </div>
          <div className="topbar-right">
            {currentUser && (
              <>
                <span className="topbar-user-dot" aria-hidden="true" />
                <span className="topbar-username">{currentUser.username}</span>
                <button
                  className="topbar-signout"
                  onClick={() => void signOut()}
                  type="button"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
