import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileBarChart2,
  Settings,
  LogOut,
  Plus,
} from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./logo";
import { clients } from "@/lib/mock-data";
import { getMockUser, signOutMock } from "@/lib/auth-mock";
import { useEffect, useState } from "react";

const nav = [
  { to: "/app", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/app/clients", label: "Clientes", icon: Users, exact: false },
  { to: "/app/reports", label: "Relatórios", icon: FileBarChart2, exact: false },
  { to: "/app/settings", label: "Integrações", icon: Settings, exact: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    setUser(getMockUser());
  }, []);

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-5 py-5">
          <Link to="/app">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-6 px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
            Clientes
          </div>
          <div className="space-y-0.5">
            {clients.map((c) => {
              const to = `/app/clients/${c.id}`;
              const active = location.pathname === to;
              return (
                <Link
                  key={c.id}
                  to={to}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                  }`}
                >
                  <span
                    className="grid h-6 w-6 place-items-center rounded-md text-[10px] font-semibold text-background"
                    style={{ backgroundColor: c.brandColor }}
                  >
                    {c.logo}
                  </span>
                  <span className="truncate">{c.name}</span>
                </Link>
              );
            })}
            <Link
              to="/app/clients"
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-sidebar-foreground/60 hover:text-sidebar-accent-foreground"
            >
              <Plus className="h-3 w-3" />
              Novo cliente
            </Link>
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="grid h-8 w-8 place-items-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
              {(user?.name ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium capitalize">
                {user?.name ?? "Visitante"}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                {user?.email ?? "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                signOutMock();
                navigate({ to: "/login" });
              }}
              className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:pl-64">{children}</main>
    </div>
  );
}
