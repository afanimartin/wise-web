type StatusBadgeProps = {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral";
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`admin-status admin-status-${tone}`}>{label}</span>;
}
