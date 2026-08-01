type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <article className="admin-metric">
      <span className="admin-metric-label">{label}</span>
      <strong className="admin-metric-value">{value}</strong>
      {hint ? <p className="muted">{hint}</p> : null}
    </article>
  );
}
