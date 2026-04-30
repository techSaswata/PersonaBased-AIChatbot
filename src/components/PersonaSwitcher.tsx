import Image from "next/image";
import type { Persona, PersonaId } from "@/lib/types";

type PersonaSwitcherProps = {
  personas: Persona[];
  activePersonaId: PersonaId;
  onChange: (personaId: PersonaId) => void;
};

export function PersonaSwitcher({
  personas,
  activePersonaId,
  onChange
}: PersonaSwitcherProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {personas.map((persona) => {
        const isActive = persona.id === activePersonaId;

        return (
          <button
            key={persona.id}
            type="button"
            onClick={() => onChange(persona.id)}
            className={`group relative overflow-hidden rounded-3xl border p-4 text-left transition duration-300 hover:-translate-y-1 ${
              isActive
                ? "border-white/25 bg-white/[0.12] shadow-2xl shadow-indigo-950/40"
                : "border-white/10 bg-white/[0.055] hover:border-white/20 hover:bg-white/[0.09]"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="relative flex items-center gap-3">
              <div
                className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br ${persona.accent} text-sm font-bold text-white shadow-lg shadow-black/30`}
              >
                <span>{persona.name.slice(0, 1)}</span>
                <Image
                  src={persona.avatarUrl}
                  alt={persona.name}
                  fill
                  unoptimized
                  sizes="48px"
                  className="rounded-2xl object-cover"
                  style={{ objectPosition: persona.avatarPosition }}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div>
                <p className="font-semibold text-white">{persona.name}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{persona.title}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
