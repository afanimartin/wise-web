"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DataTable } from "@/components/admin/DataTable";
import { MetricCard } from "@/components/admin/MetricCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { listAuditEntries, type AuditEntry } from "@/lib/audit-log";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminOverviewPage() {
  const { profile } = useAdminAuth();
  const recentEntries = useMemo(() => listAuditEntries(5), []);

  const enabledModules = useMemo(() => {
    if (!profile) return 0;
    const checks = [
      profile.permissions.includes("wallet:credit"),
      profile.permissions.includes("transfer:approve"),
      profile.permissions.includes("user:read:any"),
      profile.permissions.some((permission) => permission.startsWith("admin:")),
    ];
    return checks.filter(Boolean).length;
  }, [profile]);

  return (
    <div className="admin-page">
      <PageHeader
        title="Overview"
        description="Operational summary for wallet funding, transfer review, and admin activity."
      />

      <section className="admin-metrics-grid">
        <MetricCard label="Enabled modules" value={`${enabledModules} / 4`} hint="Based on your current permissions" />
        <MetricCard
          label="Recent admin actions"
          value={String(recentEntries.length)}
          hint="Recorded in this browser session"
        />
        <MetricCard label="Active role" value={profile?.roles.includes("ADMIN") ? "ADMIN" : "None"} />
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Quick actions</h2>
            <p className="muted">Common operator workflows.</p>
          </div>
        </div>

        <div className="admin-action-grid">
          <Link className="admin-action-card" href="/admin/wallets">
            <strong>Fund wallet</strong>
            <span>Credit a customer wallet balance</span>
          </Link>
          <Link className="admin-action-card" href="/admin/audit">
            <strong>Review audit log</strong>
            <span>Inspect recent admin actions</span>
          </Link>
          <Link className="admin-action-card" href="/admin/settings">
            <strong>View access scope</strong>
            <span>Roles, permissions, and environment</span>
          </Link>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Recent activity</h2>
            <p className="muted">Latest actions performed through this console.</p>
          </div>
          <Link className="text-link" href="/admin/audit">
            View all
          </Link>
        </div>

        <DataTable<AuditEntry>
          columns={[
            {
              key: "time",
              header: "Time",
              render: (row) => formatTimestamp(row.timestamp),
            },
            {
              key: "action",
              header: "Action",
              render: (row) => row.action,
            },
            {
              key: "summary",
              header: "Summary",
              render: (row) => row.summary,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge label={row.status === "success" ? "Success" : "Failed"} tone={row.status === "success" ? "success" : "danger"} />
              ),
            },
          ]}
          rows={recentEntries}
          rowKey={(row) => row.id}
          emptyTitle="No admin activity yet"
          emptyDescription="Wallet funding and other console actions will appear here."
        />
      </section>
    </div>
  );
}
