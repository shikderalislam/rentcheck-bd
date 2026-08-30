export default function LedgerRow({ rank, label, count, barPct, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`w-full grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_10rem_1fr_auto] items-center gap-3 py-2.5 text-left border-b border-neutral-100 dark:border-neutral-800 last:border-0 ${
        active ? "bg-amber-50 dark:bg-amber-900/10" : ""
      }`}
    >
      <span className="text-xs text-neutral-400 font-mono">{String(rank).padStart(2, "0")}</span>
      <span className="text-sm font-medium truncate">{label}</span>
      <span className="hidden sm:block h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <span className="block h-full bg-neutral-900 dark:bg-amber-400 rounded-full" style={{ width: `${barPct}%` }} />
      </span>
      <span className="text-sm font-semibold whitespace-nowrap">{count} <span className="text-neutral-400 font-normal">রিপোর্ট</span></span>
    </button>
  );
}
