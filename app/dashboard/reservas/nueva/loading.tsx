export default function NuevaReservaLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="h-6 w-40 animate-pulse rounded-xl bg-white" />
        <div className="h-10 w-72 animate-pulse rounded-2xl bg-white" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-3xl bg-white" />
          <div className="h-64 animate-pulse rounded-3xl bg-white" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-3xl bg-white" />
          <div className="h-64 animate-pulse rounded-3xl bg-white" />
        </div>
      </div>
    </div>
  );
}
