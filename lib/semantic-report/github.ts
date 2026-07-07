import { labelsForSemanticReport } from "@/lib/semantic-report/labels";
import type { IssueType } from "@/lib/semantic-report/types";

const GITHUB_OWNER = "ksteffe";
const GITHUB_REPO = "after-certainty";

export type CreateGitHubIssueInput = {
  title: string;
  body: string;
  issueType: IssueType;
};

export type CreateGitHubIssueResult =
  | { ok: true; issueUrl: string; issueNumber: number }
  | { ok: false; status: number; message: string };

export function githubIssueReportToken(): string | null {
  const token = process.env.GITHUB_ISSUE_REPORT_TOKEN?.trim();
  return token && token.length > 0 ? token : null;
}

export async function createGitHubSemanticReportIssue(
  input: CreateGitHubIssueInput,
): Promise<CreateGitHubIssueResult> {
  const token = githubIssueReportToken();
  if (!token) {
    return { ok: false, status: 503, message: "Reporting is temporarily unavailable." };
  }

  const labels = labelsForSemanticReport(input.issueType);
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "after-certainty-site-semantic-report",
      },
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        labels,
      }),
    },
  );

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : "GitHub API request failed.";
    return { ok: false, status: response.status, message };
  }

  const issue = payload as { html_url?: string; number?: number };
  if (!issue.html_url || typeof issue.number !== "number") {
    return { ok: false, status: 502, message: "Unexpected GitHub API response." };
  }

  return { ok: true, issueUrl: issue.html_url, issueNumber: issue.number };
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return true;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp && remoteIp !== "unknown") {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) return false;
  const payload = (await response.json()) as { success?: boolean };
  return payload.success === true;
}
