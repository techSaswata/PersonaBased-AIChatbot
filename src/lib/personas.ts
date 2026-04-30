import { personaById, personas } from "@/data/personaPrompts";
import type { PersonaId } from "@/lib/types";

export function getPersona(personaId: PersonaId) {
  return personaById[personaId] ?? personaById.anshuman;
}

export function isPersonaId(value: string): value is PersonaId {
  return personas.some((persona) => persona.id === value);
}

export { personas };
