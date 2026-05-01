import { useState } from "react";
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const activePersona = personas.find((persona) => persona.id === activePersonaId) ?? personas[0];

  function handleSelect(personaId: PersonaId) {
    onChange(personaId);
    setIsMobileOpen(false);
  }

  function renderPersonaCard(persona: Persona, isCompact = false) {
    const isActive = persona.id === activePersonaId;

    return (
      <button
        key={persona.id}
        type="button"
        onClick={() => handleSelect(persona.id)}
        className={`group relative w-full overflow-hidden rounded-3xl border p-3 text-left transition duration-300 hover:-translate-y-1 sm:p-4 ${
          isCompact ? "" : "md:min-w-0"
        } ${
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
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{persona.name}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{persona.title}</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen((current) => !current)}
          className="glass-panel flex w-full items-center justify-between gap-3 rounded-3xl p-3 text-left"
          aria-expanded={isMobileOpen}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br ${activePersona.accent} text-sm font-bold text-white shadow-lg shadow-black/30`}
            >
              <span>{activePersona.name.slice(0, 1)}</span>
              <Image
                src={activePersona.avatarUrl}
                alt={activePersona.name}
                fill
                unoptimized
                sizes="48px"
                className="rounded-2xl object-cover"
                style={{ objectPosition: activePersona.avatarPosition }}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{activePersona.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">Tap to switch mentor</p>
            </div>
          </div>
          <svg
            className={`h-5 w-5 shrink-0 text-slate-300 transition ${isMobileOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {isMobileOpen ? (
          <div className="mt-3 grid gap-2">
            {personas
              .filter((persona) => persona.id !== activePersonaId)
              .map((persona) => renderPersonaCard(persona, true))}
          </div>
        ) : null}
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-3">
        {personas.map((persona) => renderPersonaCard(persona))}
      </div>
    </>
  );
}
