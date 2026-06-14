import { FormEvent, useState } from "react";

type MessageInputProps = {
  onSubmit: (message: string) => void;
  disabled?: boolean;
};

export function MessageInput({ onSubmit, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 shrink-0 border-t border-white/10 pt-3">
      <div className="hud-panel rounded-2xl border border-white/15 bg-black/25 p-2">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Message Hermes..."
          rows={2}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-2 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
        />
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-[11px] text-ink-500">Shift+Enter for newline</p>
          <button
            type="submit"
            disabled={disabled}
            className="rounded-lg border border-cyan-300/35 bg-cyan-400/15 px-3 py-1.5 text-xs text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
