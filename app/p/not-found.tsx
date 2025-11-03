export default function PublicNotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Link unavailable</h1>
        <p className="text-sm text-muted-foreground">
          This file is either private or no longer exists. Ask the owner to create a new public link.
        </p>
      </div>
    </main>
  );
}
