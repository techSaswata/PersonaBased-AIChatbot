import type { ChatMessage } from "@/lib/types";
import type { ReactNode } from "react";

type MessageBubbleProps = {
  message: ChatMessage;
};

type ContentSegment =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "code";
      content: string;
      language?: string;
    };

function splitContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const codeFencePattern = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeFencePattern.exec(content)) !== null) {
    const textBeforeCode = content.slice(lastIndex, match.index).trim();

    if (textBeforeCode) {
      segments.push({ type: "text", content: textBeforeCode });
    }

    segments.push({
      type: "code",
      language: match[1],
      content: match[2].trim()
    });

    lastIndex = codeFencePattern.lastIndex;
  }

  const remainingText = content.slice(lastIndex).trim();

  if (remainingText) {
    segments.push({ type: "text", content: remainingText });
  }

  return segments.length ? segments : [{ type: "text", content }];
}

function normalizeMarkdownText(text: string) {
  return text.replace(/\\([*_`[\]()])/g, "$1");
}

function formatInline(text: string): ReactNode[] {
  const normalizedText = normalizeMarkdownText(text);

  return normalizedText.split(/(\*\*.+?\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md border border-white/10 bg-black/35 px-1.5 py-0.5 text-[0.85em] text-sky-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

function renderTextBlock(block: string, blockIndex: number) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
    return (
      <p
        key={`heading-${blockIndex}`}
        className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200"
      >
        {lines[0].replace(/^#{1,3}\s+/, "")}
      </p>
    );
  }

  if (lines.some((line) => /^#{1,3}\s+/.test(line))) {
    return (
      <div key={`mixed-${blockIndex}`} className="space-y-2">
        {lines.map((line, index) =>
          /^#{1,3}\s+/.test(line) ? (
            <p
              key={`${line}-${index}`}
              className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-200"
            >
              {line.replace(/^#{1,3}\s+/, "")}
            </p>
          ) : (
            <p key={`${line}-${index}`} className="whitespace-pre-wrap">
              {formatInline(line)}
            </p>
          )
        )}
      </div>
    );
  }

  if (lines.every((line) => /^[-*]\s+/.test(line))) {
    return (
      <ul key={`list-${blockIndex}`} className="space-y-1.5 pl-1">
        {lines.map((line, index) => (
          <li key={`${line}-${index}`} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" />
            <span>{formatInline(line.replace(/^[-*]\s+/, ""))}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (lines.every((line) => /^\d+\.\s+/.test(line))) {
    return (
      <ol key={`ordered-${blockIndex}`} className="space-y-1.5">
        {lines.map((line, index) => (
          <li key={`${line}-${index}`} className="flex gap-2">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-semibold text-sky-200">
              {index + 1}
            </span>
            <span>{formatInline(line.replace(/^\d+\.\s+/, ""))}</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <p key={`paragraph-${blockIndex}`} className="whitespace-pre-wrap">
      {formatInline(lines.join("\n"))}
    </p>
  );
}

function FormattedAssistantMessage({ content }: { content: string }) {
  const segments = splitContent(content);

  return (
    <div className="space-y-3">
      {segments.map((segment, index) => {
        if (segment.type === "code") {
          return (
            <div
              key={`code-${index}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/45"
            >
              {segment.language ? (
                <div className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {segment.language}
                </div>
              ) : null}
              <pre className="overflow-x-auto p-3 text-xs leading-5 text-slate-100">
                <code>{segment.content}</code>
              </pre>
            </div>
          );
        }

        return segment.content
          .split(/\n{2,}/)
          .map((block, blockIndex) => renderTextBlock(block, index + blockIndex));
      })}
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreamingPlaceholder = !isUser && !message.content;

  if (isStreamingPlaceholder) {
    return null;
  }

  return (
    <div className={`flex animate-float-in ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-2xl md:max-w-[72%] ${
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-indigo-950/40"
            : "border border-white/10 bg-white/[0.08] text-slate-100 shadow-black/30 backdrop-blur-xl"
        }`}
      >
        <div className={isUser ? "whitespace-pre-wrap" : ""}>
          {isUser ? message.content : <FormattedAssistantMessage content={message.content} />}
        </div>
      </div>
    </div>
  );
}
