"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { apiBaseUrl } from "@/lib/api";

export default function AdminSettingsPage() {
  const { profile, user } = useAdminAuth();

  const adminPermissions = useMemo(
    () => profile?.permissions.filter((permission) => permission.startsWith("admin:")) ?? [],
    [profile],
  );

  const environmentLabel = process.env.NEXT_PUBLIC_APP_ENV ?? "local";

  return (
    <div className="admin-page">
      <PageHeader
        title="Settings"
        description="Identity, permissions, and environment details for this admin session."
      />

      <section className="admin-panel">
        <h2>Session identity</h2>
        <dl className="admin-detail-grid">
          <div>
            <dt>Signed in as</dt>
            <dd>{user?.email ?? "Not signed in"}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd>
              <code>{profile?.userId ?? "—"}</code>
            </dd>
          </div>
          <div>
            <dt>Firebase UID</dt>
            <dd>
              <code>{profile?.firebaseUid ?? "—"}</code>
            </dd>
          </div>
        </dl>
      </section>

      <section className="admin-panel">
        <h2>Environment</h2>
        <dl className="admin-detail-grid">
          <div>
            <dt>App environment</dt>
            <dd>
              <StatusBadge
                label={environmentLabel}
                tone={environmentLabel === "production" ? "danger" : environmentLabel === "staging" ? "warning" : "neutral"}
              />
            </dd>
          </div>
          <div>
            <dt>API target</dt>
            <dd>
              <code>{apiBaseUrl}</code>
            </dd>
          </div>
        </dl>
      </section>

      <section className="admin-panel">
        <h2>Access scope</h2>
        <div className="badge-grid">
          {profile?.roles.map((role) => (
            <span className="badge" key={role}>
              {role}
            </span>
          )) ?? null}
          {profile?.permissions.map((permission) => (
            <span className="badge muted-badge" key={permission}>
              {permission}
            </span>
          )) ?? null}
        </div>
      </section>

      <section className="admin-panel">
        <h2>Module access</h2>
        <div className="admin-grid">
          <div>
            <strong>Wallet operations</strong>
            <span>{profile?.permissions.includes("wallet:credit") ? "Enabled" : "Not granted"}</span>
          </div>
          <div>
            <strong>Transfer approval</strong>
            <span>{profile?.permissions.includes("transfer:approve") ? "Enabled" : "Not granted"}</span>
          </div>
          <div>
            <strong>User lookup</strong>
            <span>{profile?.permissions.includes("user:read:any") ? "Enabled" : "Not granted"}</span>
          </div>
          <div>
            <strong>Admin console</strong>
            <span>{adminPermissions.length > 0 ? adminPermissions.join(", ") : "Limited"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
