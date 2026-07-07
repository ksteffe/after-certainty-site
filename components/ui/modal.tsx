"use client";

import { useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  descriptionId?: string;
  children: React.ReactNode;
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  titleId,
  descriptionId,
  children,
  className,
}: ModalProps) {
  const autoTitleId = useId();
  const resolvedTitleId = titleId ?? autoTitleId;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[500] bg-bg/80 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={handleBackdropClick}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        aria-describedby={descriptionId}
        className="fixed inset-0 z-[501] flex items-end justify-center p-4 sm:items-center sm:p-6"
        onClick={handleBackdropClick}
      >
        <div
          className={cn(
            "relative max-h-[min(92vh,48rem)] w-full max-w-lg overflow-y-auto rounded-sm border border-border/60 bg-bg shadow-2xl",
            className,
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-bg/95 px-5 py-4 backdrop-blur-sm">
            <h2
              id={resolvedTitleId}
              className="font-display text-xl font-medium tracking-tight text-fg"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm px-2 py-1 text-xs uppercase tracking-[0.2em] text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Close
            </button>
          </div>
          <div className="px-5 py-5">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  );
}
