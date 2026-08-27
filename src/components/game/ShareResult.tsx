"use client";

import { useCallback, useEffect, useState } from "react";
import { buildShareText, shareResult, type RoundResult } from "@/lib/pokemon";

interface ShareResultProps {
  results: readonly RoundResult[];
  totalScore: number;
  maxScore: number;
}

type Status = "idle" | "shared" | "copied" | "unavailable";

const MESSAGES: Record<Status, string> = {
  idle: "",
  shared: "Shared.",
  copied: "Copied to clipboard.",
  unavailable: "Copy the text above to share.",
};

export function ShareResult({ results, totalScore, maxScore }: ShareResultProps) {
  const [status, setStatus] = useState<Status>("idle");
  const text = buildShareText(results, totalScore, maxScore);

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const onShare = useCallback(async () => {
    setStatus(await shareResult(text));
  }, [text]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onShare}
        className="w-full rounded-2xl border-2 border-line-strong bg-surface px-6 py-4 text-base font-bold
          tracking-tight transition hover:bg-accent-soft active:translate-y-px"
      >
        Share result
      </button>

      <p className="min-h-5 text-center text-sm text-ink-soft" role="status" aria-live="polite">
        {MESSAGES[status]}
      </p>

      {status === "unavailable" ? (
        <pre className="overflow-x-auto rounded-2xl border-2 border-line bg-surface p-4 text-sm leading-6 whitespace-pre-wrap">
          {text}
        </pre>
      ) : null}
    </div>
  );
}
