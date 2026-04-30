type SuggestionChipsProps = {
  suggestions: string[];
  disabled?: boolean;
  onSelect: (suggestion: string) => void;
};

export function SuggestionChips({ suggestions, disabled, onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(suggestion)}
          className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-medium text-slate-200 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
