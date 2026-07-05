export default function PlaceholderPage({ title = "Page en construction" }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-text-muted">
      <h2 className="text-headline-sm font-headline-sm mb-2 text-text-main">{title}</h2>
      <p className="text-body-md">Cette fonctionnalité sera complétée prochainement.</p>
    </div>
  );
}
