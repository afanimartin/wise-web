"use client";

import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";

export default function AdminTransfersPage() {
  const { profile } = useAdminAuth();
  const canApprove = profile?.permissions.includes("transfer:approve") ?? false;

  return (
    <div className="admin-page">
      <PageHeader
        title="Transfers"
        description="Review and approve transfer requests requiring operator action."
      />

      <section className="admin-panel admin-empty-state">
        <StatusBadge label={canApprove ? "Permission granted" : "Permission required"} tone={canApprove ? "success" : "warning"} />
        <h2>Transfer review is not connected yet</h2>
        <p className="muted">
          The backend exposes transfer creation, but an admin approval queue endpoint is not wired into this console yet.
          When available, pending transfers will appear here with maker-checker controls and immutable audit events.
        </p>
      </section>
    </div>
  );
}
