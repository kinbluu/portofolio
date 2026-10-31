import { RotateCcw } from "lucide-react";

interface Props {
  assistant: string;
  initials: string;
  status: string;
  onReset?: () => void;
}

export default function ChatHeader({
  assistant,
  initials,
  status,
  onReset,
}: Props) {
  return (
    <div className="flex items-center gap-3 bg-ink px-4 py-3.5 lg:px-5 lg:py-[18px]">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-pill bg-accent font-heading text-body font-bold text-paper"
        aria-hidden="true"
      >
        {initials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-heading text-label/[1.5] font-bold text-paper">
          {assistant}
        </p>
        <p className="flex items-center gap-1.5 text-micro/[1.5] text-on-ink-muted">
          <span
            className="size-2 rounded-full bg-online"
            aria-hidden="true"
          ></span>
          {status}
        </p>
      </div>
      <div className="flex items-center gap-6">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            aria-label="Mulai percakapan baru"
            title="Mulai percakapan baru"
            className="hit-target text-paper focus-visible:outline-paper"
          >
            <RotateCcw size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
