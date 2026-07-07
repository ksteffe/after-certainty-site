"use client";

import { useCallback, useId, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { exploreSecondaryButtonClass } from "@/components/explore/explore-action-buttons";
import { cn } from "@/lib/cn";
import {
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  type IssueType,
  type SemanticReportDisplayContext,
} from "@/lib/semantic-report/types";

type SemanticDataIssueReporterProps = {
  context: SemanticReportDisplayContext;
};

const fieldClassName =
  "mt-2 w-full rounded-sm border border-border/70 bg-bg-elevated/40 px-4 py-2.5 text-sm text-fg placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const labelClassName = "text-[11px] uppercase tracking-[0.26em] text-muted";

const primaryButtonClassName =
  "inline-flex min-h-[44px] items-center justify-center border border-accent/35 bg-accent-soft px-6 py-3 text-xs uppercase tracking-[0.22em] text-accent transition-colors hover:bg-accent/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex min-h-[44px] items-center justify-center border border-border/55 px-6 py-3 text-xs uppercase tracking-[0.22em] text-fg transition-colors hover:border-accent/35 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60";

type FormState = {
  issueType: IssueType;
  description: string;
  suggestedCorrection: string;
  evidence: string;
};

const initialFormState: FormState = {
  issueType: "incorrect-description",
  description: "",
  suggestedCorrection: "",
  evidence: "",
};

export function SemanticDataIssueReporter({ context }: SemanticDataIssueReporterProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const descriptionId = useId();

  const resetSuccess = useCallback(() => {
    setSuccessUrl(null);
    setError(null);
  }, []);

  const handleOpen = useCallback(() => {
    resetSuccess();
    setOpen(true);
  }, [resetSuccess]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setOpen(false);
  }, [submitting]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (submitting) return;

      setError(null);
      setSubmitting(true);

      try {
        const response = await fetch("/api/semantic-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityKind: context.entityType,
            entitySlug: context.entitySlug,
            issueType: form.issueType,
            description: form.description,
            suggestedCorrection: form.suggestedCorrection || undefined,
            evidence: form.evidence || undefined,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          }),
        });

        const payload = (await response.json()) as { error?: string; issueUrl?: string };

        if (!response.ok) {
          setError(payload.error ?? "Could not submit report. Please try again.");
          return;
        }

        setSuccessUrl(payload.issueUrl ?? null);
        setForm(initialFormState);
      } catch {
        setError("Could not submit report. Please check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [context.entitySlug, context.entityType, form, submitting],
  );

  return (
    <>
      <div className="mt-8 border-t border-border/25 pt-6">
        <button
          type="button"
          onClick={handleOpen}
          className={cn(exploreSecondaryButtonClass, "text-[11px]")}
        >
          Report data issue
        </button>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Flag a possible problem in the semantic knowledge graph. Reports become GitHub issues for
          review — not website bug reports.
        </p>
      </div>

      <Modal
        open={open}
        onClose={handleClose}
        title="Report semantic data issue"
        descriptionId={descriptionId}
      >
        <p id={descriptionId} className="text-sm leading-relaxed text-muted">
          Describe what looks wrong in the graph data for this entry. Your report is reviewed before
          any changes are made.
        </p>

        <div className="mt-5 rounded-sm border border-border/35 bg-bg-elevated/30 p-4 text-sm text-muted">
          <p className={labelClassName}>Trusted context</p>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted/80">Entity</dt>
              <dd className="text-fg">
                {context.entityTypeLabel}: {context.entityTitle}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted/80">Slug</dt>
              <dd className="font-mono text-xs text-fg/90">{context.entitySlug}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted/80">Page</dt>
              <dd className="break-all text-xs text-fg/90">{context.pageUrl}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted/80">Manifest</dt>
              <dd className="text-xs text-fg/90">v{context.manifestVersion}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted/80">Relationships</dt>
              <dd className="whitespace-pre-wrap font-mono text-xs text-fg/80">
                {context.relationshipsPreview}
              </dd>
            </div>
          </dl>
        </div>

        {successUrl ? (
          <div className="mt-5 rounded-sm border border-accent/30 bg-accent-soft/40 p-4 text-sm text-fg">
            <p className="font-medium text-accent">Report submitted</p>
            <p className="mt-2 text-muted">Thank you. A GitHub issue was created for review.</p>
            <a
              href={successUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-sm text-accent underline underline-offset-4 hover:text-fg"
            >
              View issue on GitHub
            </a>
            <div className="mt-5">
              <button type="button" onClick={handleClose} className={secondaryButtonClassName}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="issue-type" className={labelClassName}>
                Issue type <span className="text-accent">*</span>
              </label>
              <select
                id="issue-type"
                required
                value={form.issueType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, issueType: event.target.value as IssueType }))
                }
                className={fieldClassName}
              >
                {ISSUE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ISSUE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="issue-description" className={labelClassName}>
                Description <span className="text-accent">*</span>
              </label>
              <textarea
                id="issue-description"
                required
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className={fieldClassName}
                placeholder="What looks incorrect or missing?"
              />
            </div>

            <div>
              <label htmlFor="issue-correction" className={labelClassName}>
                Suggested correction
              </label>
              <textarea
                id="issue-correction"
                rows={3}
                value={form.suggestedCorrection}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, suggestedCorrection: event.target.value }))
                }
                className={fieldClassName}
                placeholder="Optional — how should the graph data read instead?"
              />
            </div>

            <div>
              <label htmlFor="issue-evidence" className={labelClassName}>
                Evidence
              </label>
              <textarea
                id="issue-evidence"
                rows={3}
                value={form.evidence}
                onChange={(event) => setForm((prev) => ({ ...prev, evidence: event.target.value }))}
                className={fieldClassName}
                placeholder="Optional — URL, book reference, quote, or explanation"
              />
            </div>

            {error ? (
              <p
                className="rounded-sm border border-border/50 bg-bg-elevated/50 px-3 py-2 text-sm text-fg"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="submit" disabled={submitting} className={primaryButtonClassName}>
                {submitting ? "Submitting…" : "Submit report"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleClose}
                className={secondaryButtonClassName}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
