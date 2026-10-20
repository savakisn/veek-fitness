export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pt-[max(1.75rem,env(safe-area-inset-top))] pb-4">
      <div className="min-w-0">
        <h1 className="text-title text-balance">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
