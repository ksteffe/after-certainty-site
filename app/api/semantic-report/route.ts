import { NextResponse } from "next/server";
import { getExploreSemanticGraph } from "@/lib/explore/exploreSemanticGraph";
import { buildGraphIndex } from "@/lib/graph/graph";
import {
  buildSemanticReportTrustedContext,
  resolveEntityByKindAndSlug,
} from "@/lib/semantic-report/build-context";
import {
  formatSemanticReportIssueBody,
  formatSemanticReportIssueTitle,
} from "@/lib/semantic-report/format-issue";
import {
  createGitHubSemanticReportIssue,
  githubIssueReportToken,
  verifyTurnstileToken,
} from "@/lib/semantic-report/github";
import {
  checkDuplicate,
  checkRateLimit,
  clientIpFromRequest,
  hashFingerprint,
} from "@/lib/semantic-report/rate-limit";
import { sanitizeUserAgent, sanitizeUserObservation } from "@/lib/semantic-report/sanitize";
import { semanticReportRequestSchema } from "@/lib/semantic-report/types";

export async function POST(request: Request) {
  try {
    if (!githubIssueReportToken()) {
      console.warn("[semantic-report] unavailable: GITHUB_ISSUE_REPORT_TOKEN not set");
      return NextResponse.json(
        { error: "Semantic data reporting is temporarily unavailable." },
        { status: 503 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = semanticReportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid report payload." }, { status: 400 });
    }

    const ip = clientIpFromRequest(request);
    const rate = checkRateLimit(`semantic-report:${ip}`);
    if (!rate.allowed) {
      console.warn(
        `[semantic-report] rate-limited ipHash=${hashFingerprint([ip])} retryAfterMs=${rate.retryAfterMs ?? 0}`,
      );
      return NextResponse.json(
        { error: "Too many reports. Please try again later." },
        { status: 429 },
      );
    }

    const sanitized = sanitizeUserObservation({
      issueType: parsed.data.issueType,
      description: parsed.data.description,
      suggestedCorrection: parsed.data.suggestedCorrection,
      evidence: parsed.data.evidence,
    });
    if (!sanitized.ok) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 });
    }

    const fingerprint = hashFingerprint([
      parsed.data.entityKind,
      parsed.data.entitySlug,
      sanitized.observation.issueType,
      sanitized.observation.description,
    ]);
    if (checkDuplicate(fingerprint)) {
      console.warn(
        `[semantic-report] duplicate ipHash=${hashFingerprint([ip])} entity=${parsed.data.entityKind}/${parsed.data.entitySlug}`,
      );
      return NextResponse.json(
        { error: "An identical report was submitted recently. Please wait before resubmitting." },
        { status: 409 },
      );
    }

    if (process.env.TURNSTILE_SECRET_KEY?.trim()) {
      if (!parsed.data.captchaToken) {
        return NextResponse.json({ error: "CAPTCHA verification required." }, { status: 400 });
      }
      const captchaOk = await verifyTurnstileToken(parsed.data.captchaToken, ip);
      if (!captchaOk) {
        return NextResponse.json({ error: "CAPTCHA verification failed." }, { status: 400 });
      }
    }

    const { graph } = await getExploreSemanticGraph();
    const index = buildGraphIndex(graph);
    const entity = resolveEntityByKindAndSlug(
      graph,
      index,
      parsed.data.entityKind,
      parsed.data.entitySlug,
    );
    if (!entity) {
      return NextResponse.json({ error: "Entity not found." }, { status: 404 });
    }

    const userAgent = sanitizeUserAgent(parsed.data.userAgent);
    const trusted = buildSemanticReportTrustedContext({
      graph,
      index,
      entity,
      userAgent,
    });

    const title = formatSemanticReportIssueTitle(trusted, sanitized.observation);
    const issueBody = formatSemanticReportIssueBody(trusted, sanitized.observation);

    const github = await createGitHubSemanticReportIssue({
      title,
      body: issueBody,
      issueType: sanitized.observation.issueType,
    });

    if (!github.ok) {
      console.warn(
        `[semantic-report] github-failed entity=${entity.kind}/${entity.slug} status=${github.status}`,
      );
      const status = github.status >= 500 ? 502 : 502;
      return NextResponse.json(
        { error: "Could not submit report. Please try again later." },
        { status },
      );
    }

    console.info(
      `[semantic-report] success entity=${entity.kind}/${entity.slug} issue=${github.issueNumber} ipHash=${hashFingerprint([ip])}`,
    );

    return NextResponse.json({ ok: true, issueUrl: github.issueUrl }, { status: 200 });
  } catch (error) {
    console.warn("[semantic-report] internal-error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
