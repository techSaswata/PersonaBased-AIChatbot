"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { personas } from "@/lib/personas";
import type { ChatMessage, PersonaId } from "@/lib/types";
import { MessageBubble } from "@/components/MessageBubble";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { SuggestionChips } from "@/components/SuggestionChips";
import { TypingIndicator } from "@/components/TypingIndicator";

const CHAT_STORAGE_KEY = "persona-chat-histories";
const ACTIVE_PERSONA_STORAGE_KEY = "persona-chat-active-persona";
const RESPONSE_CACHE_KEY = "persona-chat-response-cache";
const RESPONSE_CACHE_VERSION = 3;
const RESPONSE_CACHE_TTL_MS = 20 * 60 * 1000;
const personaIds = personas.map((persona) => persona.id);

type ChatHistories = Record<PersonaId, ChatMessage[]>;
type LoadingState = Record<PersonaId, boolean>;
type CachedResponse = {
  content: string;
  expiresAt: number;
};
type ResponseCache = Record<string, CachedResponse>;

const welcomeMessage = (personaId: PersonaId): ChatMessage => {
  const persona = personas.find((item) => item.id === personaId) ?? personas[0];

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: `Hi, I am an AI persona inspired by ${persona.name}. Pick a suggestion or ask me anything.`
  };
};

const initialChatHistories = (): ChatHistories =>
  personas.reduce((histories, persona) => {
    histories[persona.id] = [welcomeMessage(persona.id)];
    return histories;
  }, {} as ChatHistories);

const initialLoadingState = (): LoadingState =>
  personas.reduce((loadingState, persona) => {
    loadingState[persona.id] = false;
    return loadingState;
  }, {} as LoadingState);

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<ChatMessage>;

  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function parseStoredHistories(value: string | null): ChatHistories | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<Record<PersonaId, unknown>>;
    const fallbackHistories = initialChatHistories();

    return personaIds.reduce((histories, personaId) => {
      const storedMessages = parsed[personaId];
      histories[personaId] =
        Array.isArray(storedMessages) && storedMessages.every(isChatMessage)
          ? storedMessages
          : fallbackHistories[personaId];
      return histories;
    }, {} as ChatHistories);
  } catch {
    return null;
  }
}

function getResponseCache(): ResponseCache {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESPONSE_CACHE_KEY) || "{}") as ResponseCache;
    const now = Date.now();

    return Object.fromEntries(
      Object.entries(parsed).filter(([, cachedResponse]) => cachedResponse.expiresAt > now)
    );
  } catch {
    return {};
  }
}

function setResponseCache(cache: ResponseCache) {
  localStorage.setItem(RESPONSE_CACHE_KEY, JSON.stringify(cache));
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeQuestionForCache(content: string) {
  return content.trim().replace(/\s+/g, " ").toLowerCase();
}

function getCacheTopicContext(messages: ChatMessage[], question: string) {
  const normalizedQuestion = normalizeQuestionForCache(question);
  const previousUserMessages = messages.filter((message) => message.role === "user").reverse();
  const topicMessage = previousUserMessages.find(
    (message) => normalizeQuestionForCache(message.content) !== normalizedQuestion
  );

  return topicMessage ? normalizeQuestionForCache(topicMessage.content) : "";
}

function createResponseCacheKey(personaId: PersonaId, question: string, messages: ChatMessage[]) {
  return JSON.stringify({
    version: RESPONSE_CACHE_VERSION,
    personaId,
    question: normalizeQuestionForCache(question),
    topicContext: getCacheTopicContext(messages, question)
  });
}

function clearPersonaResponseCache(personaId: PersonaId) {
  const cache = getResponseCache();
  const nextCache = Object.fromEntries(
    Object.entries(cache).filter(([cacheKey]) => {
      try {
        return (JSON.parse(cacheKey) as { personaId?: PersonaId }).personaId !== personaId;
      } catch {
        return true;
      }
    })
  );

  setResponseCache(nextCache);
}

function getStoredActivePersonaId() {
  if (typeof window === "undefined") {
    return "anshuman";
  }

  const storedPersonaId = localStorage.getItem(ACTIVE_PERSONA_STORAGE_KEY);
  return personaIds.includes(storedPersonaId as PersonaId) ? (storedPersonaId as PersonaId) : "anshuman";
}

export function ChatWindow() {
  const [activePersonaId, setActivePersonaId] = useState<PersonaId>(getStoredActivePersonaId);
  const [chatHistories, setChatHistories] = useState<ChatHistories>(initialChatHistories);
  const [input, setInput] = useState("");
  const [loadingByPersona, setLoadingByPersona] = useState<LoadingState>(initialLoadingState);
  const [isRestoringChats, setIsRestoringChats] = useState(true);
  const [error, setError] = useState("");
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = useRef(false);
  const latestChatHistoriesRef = useRef<ChatHistories>(chatHistories);

  const activePersona = useMemo(
    () => personas.find((persona) => persona.id === activePersonaId) ?? personas[0],
    [activePersonaId]
  );

  const messages = chatHistories[activePersonaId];
  const isActivePersonaLoading = loadingByPersona[activePersonaId];
  const isChatBusy = isRestoringChats || isActivePersonaLoading;

  useEffect(() => {
    const storedHistories = parseStoredHistories(localStorage.getItem(CHAT_STORAGE_KEY));

    if (storedHistories) {
      setChatHistories(storedHistories);
    }

    setIsRestoringChats(false);
  }, []);

  useEffect(() => {
    latestChatHistoriesRef.current = chatHistories;
  }, [chatHistories]);

  useEffect(() => {
    if (isRestoringChats) {
      return;
    }

    const saveInterval = window.setInterval(() => {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(latestChatHistoriesRef.current));
    }, 5000);

    return () => window.clearInterval(saveInterval);
  }, [isRestoringChats]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_PERSONA_STORAGE_KEY, activePersonaId);
  }, [activePersonaId]);

  useEffect(() => {
    if (isRestoringChats || didInitialScrollRef.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      const container = messageListRef.current;

      if (!container) {
        return;
      }

      container.scrollTop = container.scrollHeight;
      didInitialScrollRef.current = true;
    });
  }, [messages, isRestoringChats]);

  function updatePersonaMessages(
    personaId: PersonaId,
    update: (currentMessages: ChatMessage[]) => ChatMessage[]
  ) {
    setChatHistories((currentHistories) => ({
      ...currentHistories,
      [personaId]: update(currentHistories[personaId])
    }));
  }

  function setPersonaLoading(personaId: PersonaId, isLoading: boolean) {
    setLoadingByPersona((currentLoadingState) => ({
      ...currentLoadingState,
      [personaId]: isLoading
    }));
  }

  function scrollQuestionIntoReadingPosition(messageId: string) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const container = messageListRef.current;
        const questionElement = container?.querySelector<HTMLElement>(
          `[data-message-id="${messageId}"]`
        );

        if (!container || !questionElement) {
          return;
        }

        const targetTop = questionElement.offsetTop - container.clientHeight * 0.22;
        container.scrollTo({
          top: Math.max(targetTop, 0),
          behavior: "auto"
        });
      });
    });
  }

  function switchPersona(personaId: PersonaId) {
    setActivePersonaId(personaId);
    setInput("");
    setError("");
  }

  function resetActivePersonaChat() {
    const freshMessages = [welcomeMessage(activePersonaId)];
    const nextHistories = {
      ...chatHistories,
      [activePersonaId]: freshMessages
    };

    setChatHistories(nextHistories);
    latestChatHistoriesRef.current = nextHistories;
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(nextHistories));
    clearPersonaResponseCache(activePersonaId);
    setInput("");
    setError("");
  }

  async function sendMessage(content: string) {
    const trimmedContent = content.trim();

    if (!trimmedContent || isChatBusy) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedContent
    };
    const assistantMessageId = crypto.randomUUID();
    const requestPersonaId = activePersonaId;
    const currentMessages = chatHistories[requestPersonaId];
    const requestMessages = [...currentMessages, userMessage].map(({ role, content }) => ({
      role,
      content
    }));
    const responseCacheKey = createResponseCacheKey(
      requestPersonaId,
      trimmedContent,
      currentMessages
    );

    const nextMessages: ChatMessage[] = [
      ...currentMessages,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: ""
      }
    ];
    updatePersonaMessages(requestPersonaId, () => nextMessages);
    setInput("");
    setError("");
    setPersonaLoading(requestPersonaId, true);
    scrollQuestionIntoReadingPosition(userMessage.id);

    try {
      const responseCache = getResponseCache();
      const cachedResponse = responseCache[responseCacheKey];

      if (cachedResponse) {
        await wait(2000);
        updatePersonaMessages(requestPersonaId, (currentPersonaMessages) =>
          currentPersonaMessages.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: cachedResponse.content
                }
              : message
          )
        );
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personaId: requestPersonaId,
          messages: requestMessages
        })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "The chatbot could not respond.");
      }

      if (!response.body) {
        throw new Error("The chatbot response stream was empty.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedReply = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        streamedReply += decoder.decode(value, { stream: true });
        updatePersonaMessages(requestPersonaId, (currentPersonaMessages) =>
          currentPersonaMessages.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: streamedReply
                }
              : message
          )
        );
      }

      streamedReply += decoder.decode();
      updatePersonaMessages(requestPersonaId, (currentPersonaMessages) =>
        currentPersonaMessages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: streamedReply
              }
            : message
        )
      );

      if (!streamedReply.trim()) {
        throw new Error("The model did not return a response. Please try again.");
      }

      setResponseCache({
        ...getResponseCache(),
        [responseCacheKey]: {
          content: streamedReply,
          expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS
        }
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again.";
      setError(message);
      updatePersonaMessages(requestPersonaId, (currentPersonaMessages) =>
        currentPersonaMessages.filter((message) => message.id !== assistantMessageId)
      );
    } finally {
      setPersonaLoading(requestPersonaId, false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-4 md:gap-6 md:px-8 md:py-6">
      <section className="glass-panel animate-float-in relative overflow-hidden rounded-3xl p-4 md:rounded-[2rem] md:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-200 sm:text-sm sm:tracking-[0.3em]">
          Persona-Based AI Chatbot
        </p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="relative">
            <h1 className="max-w-full text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:whitespace-nowrap md:text-5xl lg:text-6xl">
              Talk to Scaler-inspired mentors
            </h1>
          </div>
          <div className="animate-pulse-glow relative w-fit rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs text-slate-200 backdrop-blur-xl sm:px-4 sm:py-3 sm:text-sm">
            <span className="text-slate-400">Active:</span>{" "}
            <span className="font-semibold text-white">{activePersona.name}</span>
          </div>
        </div>
      </section>

      <PersonaSwitcher
        personas={personas}
        activePersonaId={activePersonaId}
        onChange={switchPersona}
      />

      <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[22rem_1fr] lg:gap-6">
        <aside className="glass-panel order-2 relative overflow-hidden rounded-3xl p-4 lg:order-1 lg:rounded-[2rem] lg:p-5">
          <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-r ${activePersona.accent} opacity-20 blur-2xl`} />
          <div className={`relative h-2 rounded-full bg-gradient-to-r ${activePersona.accent}`} />
          <div className="relative mt-4 flex items-center gap-3 sm:gap-4 lg:mt-5">
            <div
              className={`relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br ${activePersona.accent} text-xl font-bold text-white shadow-2xl shadow-black/40 ring-1 ring-white/15 sm:h-20 sm:w-20 sm:rounded-[1.6rem] sm:text-2xl`}
            >
              <span>{activePersona.name.slice(0, 1)}</span>
              <Image
                src={activePersona.avatarUrl}
                alt={activePersona.name}
                fill
                priority
                unoptimized
                sizes="(max-width: 640px) 64px, 80px"
                className="rounded-3xl object-cover sm:rounded-[1.6rem]"
                style={{ objectPosition: activePersona.avatarPosition }}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-white sm:text-xl">{activePersona.name}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">{activePersona.title}</p>
            </div>
          </div>
          <p className="relative mt-4 text-sm leading-6 text-slate-300">
            {activePersona.description}
          </p>
          <button
            type="button"
            onClick={resetActivePersonaChat}
            disabled={isChatBusy}
            className="relative mt-5 rounded-full border border-indigo-300/40 bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition hover:border-indigo-200/70 hover:bg-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start New chat
          </button>
          <div className="mt-5 lg:mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Quick starts
            </p>
            <SuggestionChips
              suggestions={activePersona.suggestions}
              disabled={isChatBusy}
              onSelect={sendMessage}
            />
          </div>
        </aside>

        <div className="glass-panel order-1 flex h-[64svh] min-h-[24rem] max-h-[42rem] flex-col rounded-3xl p-3 sm:h-[34rem] sm:p-4 lg:order-2 lg:rounded-[2rem]">
          <div
            ref={messageListRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-color:rgba(148,163,184,0.35)_transparent] sm:space-y-4"
          >
            {isRestoringChats ? (
              <div className="grid h-full place-items-center">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.07] px-5 py-4 text-sm font-medium text-slate-300 shadow-2xl shadow-black/25 backdrop-blur-xl">
                  <div className="absolute inset-0 animate-thinking-sheen bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                  <span className="relative">Loading saved chat...</span>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} data-message-id={message.id}>
                    <MessageBubble message={message} />
                  </div>
                ))}
                {isActivePersonaLoading ? <TypingIndicator /> : null}
                {isActivePersonaLoading ? <div className="h-[24rem]" /> : null}
              </>
            )}
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={`Ask ${activePersona.name}...`}
              disabled={isRestoringChats}
              className="min-h-11 flex-1 rounded-2xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-300/50 focus:ring-4 focus:ring-indigo-500/15 sm:min-h-12 sm:px-4"
            />
            <button
              type="submit"
              disabled={isChatBusy || !input.trim()}
              className="min-h-11 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 px-6 text-sm font-semibold text-white shadow-2xl shadow-indigo-950/40 transition duration-300 hover:-translate-y-0.5 hover:from-indigo-400 hover:to-sky-400 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 sm:min-h-12"
            >
              Send
            </button>
          </form>
        </div>
      </section>

      <footer className="pb-2 text-center text-[10px] text-slate-600">
        Made with ❤️ by techsas
      </footer>
    </main>
  );
}
