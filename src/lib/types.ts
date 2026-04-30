export type PersonaId = "anshuman" | "abhimanyu" | "kshitij";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type Persona = {
  id: PersonaId;
  name: string;
  title: string;
  accent: string;
  avatarUrl: string;
  avatarPosition?: string;
  description: string;
  suggestions: string[];
  systemPrompt: string;
};
