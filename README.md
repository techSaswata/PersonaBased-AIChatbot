# Persona-Based AI Chatbot

A Next.js chatbot with three Scaler-inspired mentor personas: Anshuman Singh, Abhimanyu Saxena, and Kshitij Mishra. It uses streamed OpenAI responses, persona-specific prompts, saved chats, and factual research support through Apify.

## Features

- Three persona modes with distinct teaching style and tone
- Streaming chat responses for lower latency
- Per-persona chat history saved in `localStorage`
- Markdown-formatted assistant answers
- Dark animated UI with responsive layout
- Server-side OpenAI and Apify integration

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- OpenAI API

## File Structure

```text
src/
  app/
    api/chat/route.ts       # Chat API, OpenAI streaming, research
    globals.css             # Global styles and animations
    layout.tsx              # App layout
    page.tsx                # Home page
  components/
    ChatWindow.tsx          # Main chat UI and localStorage logic
    MessageBubble.tsx       # Message rendering and markdown formatting
    PersonaSwitcher.tsx     # Persona selection sidebar
    SuggestionChips.tsx     # Quick prompt chips
    TypingIndicator.tsx     # Streaming/loading indicator
  data/
    personaPrompts.ts       # Persona profiles and system prompts
  lib/
    personas.ts             # Persona helpers
    types.ts                # Shared TypeScript types
```

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

## Docs

- [Prompt Design](./prompts.md): Explains how the persona prompts were designed, tuned, and grounded.
- [Reflection](./reflection.md): Short project reflection covering approach, challenges, and learnings.

## Note

These are AI personas inspired by public/classroom content.


-- Made with ❤️ by techsas
