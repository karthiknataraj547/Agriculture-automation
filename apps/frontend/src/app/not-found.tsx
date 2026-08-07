import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
        <span className="text-3xl">🌾</span>
      </div>
      <h2 className="text-3xl font-bold tracking-tight mb-2">404 - Page Not Found</h2>
      <p className="text-slate-400 max-w-md mb-6">
        The requested spatial node or resource could not be located in the farm telemetry network.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-lg transition-colors"
      >
        Return to Spatial Dashboard
      </Link>
    </div>
  );
}
