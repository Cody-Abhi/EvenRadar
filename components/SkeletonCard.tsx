export default function SkeletonCard() {
  return (
    <div className="brutal relative overflow-hidden bg-white p-5">
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-black/5 to-transparent" />
      <div className="mb-3 h-6 w-2/3 border-2 border-black bg-brut-yellow/60" />
      <div className="mb-2 h-4 w-1/3 bg-black/10" />
      <div className="mb-4 h-4 w-1/2 bg-black/10" />
      <div className="mb-4 flex gap-2">
        <div className="h-6 w-16 border-2 border-black bg-brut-cyan/50" />
        <div className="h-6 w-20 border-2 border-black bg-brut-pink/50" />
      </div>
      <div className="h-9 w-28 border-2 border-black bg-black/10" />
    </div>
  );
}
