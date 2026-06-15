function Bar({ className }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className ?? ""}`} />;
}

// Instant placeholder while a dynamic route's data resolves.
export function PageSkeleton({ title, rows = 3 }: { title: string; rows?: number }) {
  return (
    <main>
      <header className="px-4 pt-7 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Bar className="mt-2 h-4 w-44" />
      </header>
      <div className="space-y-3 px-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Bar key={i} className="h-24 w-full" />
        ))}
      </div>
    </main>
  );
}
