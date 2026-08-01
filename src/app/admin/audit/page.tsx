"use client";

import { useState } from "react";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { clearAuditEntries, listAuditEntries, type AuditEntry } from "@/lib/audit-log";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState(() => listAuditEntries(100));

  function handleClear() {
    clearAuditEntries();
    setEntries(listAuditEntries(100));
  }

  return (
    <div className="admin-page">
      <PageHeader
        title="Audit log"
        description="Admin actions recorded by this console. Entries are stored locally until a backend audit feed is connected."
        actions={
          <button type="button" className="secondary-button" onClick={handleClear} disabled={entries.length === 0}>
            Clear local log
          </button>
        }
      />

      <div className="admin-alert admin-alert-warning" role="note">
        This audit log is browser-local for now. Production banking consoles should persist immutable audit events on the server.
      </div>

      <section className="admin-panel">
        <DataTable<AuditEntry>
          columns={[
            {
              key: "time",
              header: "Time",
              render: (row) => formatTimestamp(row.timestamp),
            },
            {
              key: "actor",
              header: "Actor",
              render: (row) => (
                <div className="admin-table-stack">
                  <span>{row.actorEmail}</span>
                  <small>{row.actorUserId}</small>
                </div>
              ),
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
          rows={entries}
          rowKey={(row) => row.id}
          emptyTitle="No audit entries"
          emptyDescription="Admin actions such as wallet funding will be recorded here."
        />
      </section>
    </div>
  );
}
