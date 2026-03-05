"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

interface ToastProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  tone?: "error" | "info";
}

export default function Toast({
  message,
  isOpen,
  onClose,
  tone = "info",
}: ToastProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50">
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur",
          tone === "error"
            ? "border-rose-200/70 bg-rose-50/90 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/70 dark:text-rose-200"
            : "border-slate-200/70 bg-white/90 text-slate-700 dark:border-slate-800/70 dark:bg-slate-900/80 dark:text-slate-200",
          "animate-fade-in"
        )}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            tone === "error" ? "bg-rose-500" : "bg-slate-400"
          )}
        />
        <span>{message}</span>
      </div>
    </div>
  );
}
