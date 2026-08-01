"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { apiBaseUrl } from "@/lib/api";
import { adminNavItems } from "@/lib/admin-nav";
import { useAdminAuth } from "./AdminAuthProvider";

function getEnvironmentLabel() {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? "local";
  if (appEnv === "production") return "Production";
  if (appEnv === "staging") return "Staging";
  return "Local";
}

function isProductionEnvironment() {
  return (process.env.NEXT_PUBLIC_APP_ENV ?? "local") === "production";
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, profile, loading, error, signIn, signOutUser } = useAdminAuth();
  const environmentLabel = getEnvironmentLabel();
  const production = isProductionEnvironment();

  return (
    <div className="admin-app">
      <div className={`admin-env-banner ${production ? "admin-env-banner-danger" : ""}`} role="status">
        <span>{environmentLabel} environment</span>
        <span className="admin-env-banner-muted">{apiBaseUrl}</span>
      </div>

      <div className="admin-frame">
        <aside className="admin-sidebar" aria-label="Admin navigation">
          <div className="admin-brand">
            <p className="admin-brand-eyebrow">Wise Console</p>
            <strong>Admin</strong>
          </div>

          <nav className="admin-nav">
            {adminNavItems.map((item) => {
              const active = pathname === item.href;
              const locked =
                item.permission && profile && !profile.permissions.includes(item.permission);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-link ${active ? "admin-nav-link-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span>{item.label}</span>
                  <small>{locked ? "Permission required" : item.description}</small>
                </Link>
              );
            })}
          </nav>

          <div className="admin-sidebar-footer">
            <Link className="text-link" href="/">
              Back to API tester
            </Link>
          </div>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <p className="admin-topbar-eyebrow">Secure admin session</p>
              <strong>{user?.email ?? "Not signed in"}</strong>
            </div>

            <div className="admin-topbar-actions">
              {user ? (
                <button type="button" className="secondary-button" onClick={signOutUser}>
                  Sign out
                </button>
              ) : (
                <button type="button" onClick={signIn}>
                  Sign in with Google
                </button>
              )}
            </div>
          </header>

          {loading ? (
            <div className="admin-panel admin-empty-state" role="status" aria-live="polite">
              Checking admin access...
            </div>
          ) : null}

          {error ? (
            <div className="admin-alert admin-alert-error" role="alert">
              {error}
            </div>
          ) : null}

          {!loading && profile?.roles.includes("ADMIN") ? children : null}

          {!loading && !user ? (
            <div className="admin-panel admin-empty-state">
              <h2>Sign in required</h2>
              <p className="muted">Use your Google account with the ADMIN role to access the console.</p>
              <button type="button" onClick={signIn}>
                Sign in with Google
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
