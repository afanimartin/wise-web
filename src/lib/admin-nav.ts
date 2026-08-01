export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  permission?: string;
};

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    description: "Operational summary and recent activity",
  },
  {
    href: "/admin/wallets",
    label: "Wallets",
    description: "Credit customer wallet balances",
    permission: "wallet:credit",
  },
  {
    href: "/admin/transfers",
    label: "Transfers",
    description: "Review and approve transfer requests",
    permission: "transfer:approve",
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    description: "Admin actions recorded in this console",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    description: "Identity, permissions, and environment",
  },
];
