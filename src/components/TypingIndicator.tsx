export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="animate-float-in relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.08] px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="absolute inset-0 animate-thinking-sheen bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="relative flex items-center gap-3">
          <span className="text-xs font-medium tracking-wide text-slate-400">Thinking</span>
          <span className="flex items-end gap-1.5">
            <span className="h-1.5 w-1.5 animate-thinking-dot rounded-full bg-indigo-300 [animation-delay:-0.32s]" />
            <span className="h-2 w-2 animate-thinking-dot rounded-full bg-sky-300 [animation-delay:-0.16s]" />
            <span className="h-1.5 w-1.5 animate-thinking-dot rounded-full bg-rose-300" />
          </span>
        </div>
      </div>
    </div>
  );
}
