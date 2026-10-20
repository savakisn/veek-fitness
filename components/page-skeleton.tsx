function Bar({ className }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className ?? ""}`} />;
}

// Instant placeholder while a dynamic route's data resolves.
export function PageSkeleton({ title, rows = 3 }: { title: string; rows?: number }) {
  return (
    <main>
      <header className="px-4 pt-[max(1.75rem,env(safe-area-inset-top))] pb-4">
        <h1 className="text-title">{title}</h1>
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
