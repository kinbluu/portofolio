import {
  clientTools,
  createChatClientOptions,
  fetchServerSentEvents,
  sessionStoragePersistence,
  useChat,
  type InferChatMessages,
} from "@tanstack/ai-react";
import { TextPart } from "@tanstack/ai-react/ui";
import { ArrowUpRight, Mail, Send, Square } from "lucide-react";
import { useOverlayScrollbars } from "overlayscrollbars-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type SubmitEvent,
} from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import {
  chatLimits,
  chatRejectedCode,
  allowedChatLink,
  pageSectionLabels,
  showContactTool,
  showSectionTool,
  type PageSection,
} from "../lib/chat";
import ChatHeader from "./ChatHeader";
import "../styles/chat.css";

interface Props {
  panelId: string;
  assistant: string;
  initials: string;
  status: string;
  greeting: string;
  suggestions: string[];
  email: string;
  github: string;
}

const fallbackError =
  "Maaf, asisten sedang tidak bisa menjawab. Coba lagi sebentar lagi.";

function describeError(error: Error) {
  return "code" in error && error.code === chatRejectedCode
    ? error.message
    : fallbackError;
}

const chatOptions = createChatClientOptions({
  threadId: "portfolio-assistant",
  connection: fetchServerSentEvents("/api/chat"),
  persistence: sessionStoragePersistence(),
  tools: clientTools(
    showSectionTool.client(({ section }) => {
      const target = document.getElementById(section);
      target?.scrollIntoView({ block: "start" });
      return { shown: target !== null };
    }),
    showContactTool.client(() => ({ shown: true })),
  ),
});

type ChatMessage = InferChatMessages<typeof chatOptions>[number];

const bubble = "w-fit max-w-[85%] px-3.5 py-2.5 text-body/[1.5] wrap-anywhere";
const assistantBubble = `${bubble} rounded-[16px_16px_16px_4px] bg-paper ring-1 ring-line ring-inset`;
const userBubble = `${bubble} ml-auto rounded-[16px_16px_4px_16px] bg-accent text-paper`;
const chip =
  "hit-target w-fit rounded-pill bg-paper px-3 py-[7px] text-left text-caption/[1.5] font-medium text-accent ring-1 ring-accent ring-inset hover:bg-tint motion-safe:transition-colors";
const roundButton =
  "grid size-11 shrink-0 place-items-center rounded-pill bg-accent text-paper hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-colors lg:size-[42px]";

const hidePanel = (event: MouseEvent<HTMLElement>) =>
  event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();

export function ChatMarkdown({
  content,
  email,
  github,
}: {
  content: string;
  email: string;
  github: string;
}) {
  // Model output is untrusted: only Rahmat's own links stay clickable, images render as alt text (no remote fetch).
  const components = useMemo(
    () => ({
      a: ({ href = "", children }: ComponentPropsWithoutRef<"a">) => {
        const safe = allowedChatLink(href, email, github);
        if (!safe) return <span>{children}</span>;
        if (safe.startsWith("#"))
          return (
            <a href={safe} onClick={hidePanel}>
              {children}
            </a>
          );
        if (safe.startsWith("mailto:")) return <a href={safe}>{children}</a>;
        return (
          <a href={safe} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      },
      img: ({ alt }: ComponentPropsWithoutRef<"img">) => <span>{alt}</span>,
    }),
    [email, github],
  );
  return (
    <TextPart
      content={content}
      className="chat-markdown"
      components={components}
    />
  );
}

function SectionLink({ section }: { section: PageSection }) {
  return (
    <a
      href={`#${section}`}
      onClick={hidePanel}
      className={`${chip} inline-flex items-center gap-1.5`}
    >
      Lihat bagian {pageSectionLabels[section]}
      <ArrowUpRight size={14} />
    </a>
  );
}

function ContactCard({ email, github }: { email: string; github: string }) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-[16px_16px_16px_4px] bg-paper p-3 ring-1 ring-line ring-inset">
      <a
        href={`mailto:${email}`}
        className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-pill bg-accent px-4 text-body font-medium text-paper hover:bg-accent-hover motion-safe:transition-colors"
      >
        <Mail size={16} className="shrink-0" />
        <span className="truncate">{email}</span>
      </a>
      <a
        href={github}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-paper px-4 text-body font-medium text-ink ring-1 ring-line ring-inset hover:ring-ink motion-safe:transition-colors"
      >
        GitHub
        <ArrowUpRight size={16} />
      </a>
    </div>
  );
}

function MessageView({
  message,
  email,
  github,
}: {
  message: ChatMessage;
  email: string;
  github: string;
}) {
  if (message.role === "user") {
    const text = message.parts
      .map((part) => (part.type === "text" ? part.content : ""))
      .join("");
    return <p className={userBubble}>{text}</p>;
  }

  return message.parts.map((part, index) => {
    if (part.type === "text") {
      if (!part.content.trim()) return null;
      return (
        <div key={index} className={assistantBubble}>
          <ChatMarkdown content={part.content} email={email} github={github} />
        </div>
      );
    }
    if (part.type !== "tool-call" || part.input === undefined) return null;
    if (part.name === "show_section")
      return <SectionLink key={part.id} section={part.input.section} />;
    if (part.name === "show_contact")
      return <ContactCard key={part.id} email={email} github={github} />;
    return null;
  });
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | undefined;
  send: (text: string) => void;
  stop: () => void;
  retry: () => void;
  reset: () => void;
}

function ChatView({
  chat,
  panelId,
  assistant,
  initials,
  status,
  greeting,
  suggestions,
  email,
  github,
}: Props & { chat?: ChatState }) {
  const [input, setInput] = useState("");
  const { scrollRef, contentRef, scrollToBottom, state } = useStickToBottom({
    initial: "instant",
    resize: "smooth",
  });
  const hostRef = useRef<HTMLDivElement>(null);
  const [initializeScrollbars] = useOverlayScrollbars({
    options: {
      scrollbars: {
        theme: "os-theme-rm3",
        autoHide: "move",
        autoHideSuspend: true,
      },
    },
    defer: true,
  });

  useEffect(() => {
    if (!hostRef.current || !scrollRef.current) return;
    initializeScrollbars({
      target: hostRef.current,
      elements: { viewport: scrollRef.current },
      cancel: { nativeScrollbarsOverlaid: true },
    });
  }, [initializeScrollbars, scrollRef]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      if (state.isAtBottom) void scrollToBottom("instant");
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [scrollRef, scrollToBottom, state]);

  const messages = chat?.messages ?? [];
  const isLoading = chat?.isLoading ?? false;
  const error = chat?.error;
  const limitReached =
    messages.filter((message) => message.role === "user").length >=
    chatLimits.turns;
  const last = messages.at(-1);
  const typing =
    isLoading &&
    !(
      last?.role === "assistant" &&
      last.parts.some((part) => part.type === "text" && part.content.trim())
    );

  const send = (text: string) => {
    const content = text.trim();
    if (!chat || !content || isLoading || limitReached) return;
    setInput("");
    chat.send(content);
    void scrollToBottom();
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    send(input);
  };

  return (
    <>
      <ChatHeader
        panelId={panelId}
        assistant={assistant}
        initials={initials}
        status={status}
        onReset={messages.length > 0 ? chat?.reset : undefined}
      />
      <div ref={hostRef} className="min-h-0 flex-1 bg-soft">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overscroll-contain"
        >
          <div
            ref={contentRef}
            role="log"
            aria-live="polite"
            aria-busy={isLoading}
            className="flex flex-col gap-3 p-4 lg:p-5"
          >
            <p className={assistantBubble}>{greeting}</p>
            {messages.length === 0 && (
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={!chat}
                    className={chip}
                    onClick={() => send(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message) => (
              <MessageView
                key={message.id}
                message={message}
                email={email}
                github={github}
              />
            ))}
            {typing && (
              <div
                className={`${assistantBubble} flex items-center gap-1 py-3.5`}
              >
                {[0, 200, 400].map((delay) => (
                  <span
                    key={delay}
                    className="size-1.5 rounded-full bg-muted motion-safe:animate-pulse"
                    style={{ animationDelay: `${delay}ms` }}
                  ></span>
                ))}
                <span className="sr-only">Asisten sedang mengetik…</span>
              </div>
            )}
            {error && !isLoading && (
              <div
                role="alert"
                className={`${assistantBubble} flex flex-col items-start gap-1.5`}
              >
                <p>{describeError(error)}</p>
                <button
                  type="button"
                  className="hit-target text-caption/[1.5] font-medium text-accent"
                  onClick={chat?.retry}
                >
                  Coba lagi
                </button>
              </div>
            )}
            {limitReached && !isLoading && (
              <div className="flex flex-col items-center gap-2 py-1 text-center">
                <p className="text-caption/[1.5] text-muted">
                  Percakapan sudah mencapai batas {chatLimits.turns} pertanyaan.
                </p>
                <button type="button" className={chip} onClick={chat?.reset}>
                  Mulai percakapan baru
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-line p-3 lg:gap-2.5 lg:px-4 lg:py-3.5"
      >
        <label htmlFor="chat-message" className="sr-only">
          Pertanyaan
        </label>
        <input
          id="chat-message"
          name="message"
          type="text"
          required
          autoComplete="off"
          maxLength={chatLimits.messageLength}
          disabled={!chat || limitReached}
          placeholder="Tanyakan tentang Rahmat…"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-pill bg-soft px-4 text-body/[1.5] text-ink placeholder:text-muted disabled:opacity-60 lg:h-[42px]"
        />
        {isLoading ? (
          <button
            type="button"
            aria-label="Hentikan jawaban"
            className={roundButton}
            onClick={chat?.stop}
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Kirim pertanyaan"
            disabled={!chat || limitReached}
            className={roundButton}
          >
            <Send size={18} />
          </button>
        )}
      </form>
    </>
  );
}

function LiveChatPanel(props: Props) {
  const { messages, sendMessage, isLoading, error, stop, reload, clear } =
    useChat(chatOptions);
  const chat: ChatState = {
    messages,
    isLoading,
    error,
    stop,
    reset: clear,
    send: (text) => void sendMessage(text),
    retry: () => void reload(),
  };
  return <ChatView {...props} chat={chat} />;
}

const subscribeHydration = () => () => {};

export default function ChatPanel(props: Props) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  return hydrated ? <LiveChatPanel {...props} /> : <ChatView {...props} />;
}
