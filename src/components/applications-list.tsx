"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { ApplicationSubmission } from "@/types/application-submission";

type SourceFilter = "all" | "careerus" | "custech";

const sourceLabels: Record<"careerus" | "custech", string> = {
  careerus: "careerus",
  custech: "custech",
};

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

type Column = {
  key: string;
  header: string;
  width: string;
  render: (submission: ApplicationSubmission) => ReactNode;
};

function plainCell(value: string) {
  return value || "";
}

/**
 * Column set mirrors the original Google Sheet header row/order exactly, so
 * the migration from Sheets to this view stays familiar. `submittedFrom` and
 * `submittedAt` are appended since a single merged view now needs to tell
 * the two source forms apart.
 */
const columns: Column[] = [
  {
    key: "submittedFrom",
    header: "submittedFrom",
    width: "min-w-[120px]",
    render: (s) => sourceLabels[s.submittedFrom],
  },
  {
    key: "positionApplyingFor",
    header: "positionApplyingFor",
    width: "min-w-[160px]",
    render: (s) => plainCell(s.positionApplyingFor),
  },
  {
    key: "date",
    header: "date",
    width: "min-w-[110px]",
    render: (s) => plainCell(s.date),
  },
  {
    key: "fullName",
    header: "fullName",
    width: "min-w-[160px]",
    render: (s) => plainCell(s.fullName),
  },
  {
    key: "contactNumber",
    header: "contactNumber",
    width: "min-w-[140px]",
    render: (s) => plainCell(s.contactNumber),
  },
  {
    key: "emailAddress",
    header: "emailAddress",
    width: "min-w-[200px]",
    render: (s) => plainCell(s.emailAddress),
  },
  {
    key: "currentAddress",
    header: "currentAddress",
    width: "min-w-[220px]",
    render: (s) => plainCell(s.currentAddress),
  },
  {
    key: "whyJoinUs",
    header: "whyJoinUs",
    width: "min-w-[240px]",
    render: (s) => plainCell(s.whyJoinUs),
  },
  {
    key: "knowledgeOfJobRole",
    header: "knowledgeOfJobRole",
    width: "min-w-[240px]",
    render: (s) => plainCell(s.knowledgeOfJobRole),
  },
  {
    key: "whyChangeJob",
    header: "whyChangeJob",
    width: "min-w-[240px]",
    render: (s) => plainCell(s.whyChangeJob),
  },
  {
    key: "whyHireYou",
    header: "whyHireYou",
    width: "min-w-[240px]",
    render: (s) => plainCell(s.whyHireYou),
  },
  {
    key: "currentLastEmployer",
    header: "currentLastEmployer",
    width: "min-w-[180px]",
    render: (s) => plainCell(s.currentLastEmployer),
  },
  {
    key: "salaryExpectations",
    header: "salaryExpectations",
    width: "min-w-[150px]",
    render: (s) => plainCell(s.salaryExpectations),
  },
  {
    key: "nightShiftWilling",
    header: "nightShiftWilling",
    width: "min-w-[130px]",
    render: (s) => plainCell(s.nightShiftWilling),
  },
  {
    key: "idealWorkEnvironment",
    header: "idealWorkEnvironment",
    width: "min-w-[220px]",
    render: (s) => plainCell(s.idealWorkEnvironment),
  },
  {
    key: "referenceNameAndContact",
    header: "referenceNameAndContact",
    width: "min-w-[220px]",
    render: (s) => plainCell(s.referenceNameAndContact),
  },
  {
    key: "medicalIssues",
    header: "medicalIssues",
    width: "min-w-[180px]",
    render: (s) => plainCell(s.medicalIssues),
  },
  {
    key: "skills",
    header: "skills",
    width: "min-w-[200px]",
    render: (s) => s.skills.join(", "),
  },
  {
    key: "resumeUrl",
    header: "resumeUrl",
    width: "min-w-[220px]",
    render: (s) =>
      s.resumeUrl && s.resumeUrl.startsWith("http") ? (
        <a
          href={s.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-primary underline decoration-primary/40 hover:decoration-primary"
        >
          {s.resumeUrl}
        </a>
      ) : (
        plainCell(s.resumeUrl)
      ),
  },
  {
    key: "interviewerRemarks",
    header: "interviewerRemarks",
    width: "min-w-[200px]",
    render: (s) => plainCell(s.interviewerRemarks),
  },
  {
    key: "interviewerName",
    header: "interviewerName",
    width: "min-w-[160px]",
    render: (s) => plainCell(s.interviewerName),
  },
  {
    key: "joiningDate",
    header: "joiningDate",
    width: "min-w-[120px]",
    render: (s) => plainCell(s.joiningDate),
  },
  {
    key: "submittedAt",
    header: "submittedAt",
    width: "min-w-[180px]",
    render: (s) => formatDateTime(s.createdAt || s.submittedAt),
  },
];

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  );
}

function ApplicationDetail({
  submission,
  onClose,
}: {
  submission: ApplicationSubmission;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="mb-2 inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {sourceLabels[submission.submittedFrom]}
            </span>
            <h2 className="text-xl font-bold text-foreground">
              {submission.fullName || "Unnamed applicant"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Submitted {formatDateTime(submission.createdAt || submission.submittedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Position applying for" value={submission.positionApplyingFor} />
          <DetailRow label="Applying date" value={submission.date} />
          <DetailRow label="Contact number" value={submission.contactNumber} />
          <DetailRow label="Email address" value={submission.emailAddress} />
          <DetailRow label="Current address" value={submission.currentAddress} />
          <DetailRow label="Current / last employer" value={submission.currentLastEmployer} />
          <DetailRow label="Salary expectations" value={submission.salaryExpectations} />
          <DetailRow
            label="Willing to work night shifts"
            value={
              submission.nightShiftWilling === "yes"
                ? "Yes"
                : submission.nightShiftWilling === "no"
                  ? "No"
                  : undefined
            }
          />
          <DetailRow label="Joining date" value={submission.joiningDate} />
        </div>

        <div className="mt-4 grid gap-4">
          <DetailRow label="Why do you want to join us?" value={submission.whyJoinUs} />
          <DetailRow
            label="What do you know about this job role?"
            value={submission.knowledgeOfJobRole}
          />
          <DetailRow
            label="Why do you want to change your current/last job?"
            value={submission.whyChangeJob}
          />
          <DetailRow label="Why should we hire you?" value={submission.whyHireYou} />
          <DetailRow
            label="Ideal work environment"
            value={submission.idealWorkEnvironment}
          />
          <DetailRow
            label="Reference name & contact"
            value={submission.referenceNameAndContact}
          />
          <DetailRow label="Medical issues" value={submission.medicalIssues} />
          <DetailRow label="Interviewer remarks" value={submission.interviewerRemarks} />
          <DetailRow label="Interviewer name" value={submission.interviewerName} />
        </div>

        {submission.skills.length > 0 ? (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Skills
            </p>
            <div className="flex flex-wrap gap-2">
              {submission.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Resume
          </p>
          {submission.resumeUrl && submission.resumeUrl.startsWith("http") ? (
            <div className="flex flex-wrap gap-3">
              <a
                href={submission.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110"
              >
                Open resume
              </a>
              <a
                href={`/view-resume?url=${encodeURIComponent(submission.resumeUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Preview
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {submission.resumeFileName
                ? `No resume link was captured for "${submission.resumeFileName}".`
                : "No resume was uploaded."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ApplicationsList({
  initialSubmissions,
  mongoConfigured,
}: {
  initialSubmissions: ApplicationSubmission[];
  mongoConfigured: boolean;
}) {
  const [submissions, setSubmissions] =
    useState<ApplicationSubmission[]>(initialSubmissions);
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ApplicationSubmission | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const response = await fetch("/api/applications", { cache: "no-store" });
      const result = (await response.json()) as {
        ok?: boolean;
        submissions?: ApplicationSubmission[];
        error?: string;
      };
      if (!response.ok || !result.ok || !result.submissions) {
        throw new Error(result.error || "Failed to refresh applications.");
      }
      setSubmissions(result.submissions);
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : "Failed to refresh applications.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return submissions.filter((submission) => {
      if (filter !== "all" && submission.submittedFrom !== filter) return false;
      if (!query) return true;
      return (
        submission.fullName.toLowerCase().includes(query) ||
        submission.emailAddress.toLowerCase().includes(query) ||
        submission.contactNumber.toLowerCase().includes(query) ||
        submission.positionApplyingFor.toLowerCase().includes(query)
      );
    });
  }, [submissions, filter, search]);

  const counts = useMemo(() => {
    return submissions.reduce(
      (acc, submission) => {
        acc.all += 1;
        acc[submission.submittedFrom] += 1;
        return acc;
      },
      { all: 0, careerus: 0, custech: 0 },
    );
  }, [submissions]);

  return (
    <div className="mx-auto w-full max-w-400 space-y-7 px-4 pb-16 pt-8 sm:px-6">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="hidden shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary p-3 shadow-sm shadow-primary/20 sm:flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-white"
              aria-hidden
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18M9 4v16" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              CareerUS Solutions
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Interview applications
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every submission from the CareerUS and CUSTECH interview
              forms, in one live, database-backed sheet.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isRefreshing}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {!mongoConfigured ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Database is not configured. Set MONGODB_URI to see submissions here.
        </p>
      ) : null}

      {refreshError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {refreshError}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit gap-1 rounded-full border border-border bg-muted/40 p-1">
          {(
            [
              { key: "all", label: "All", count: counts.all },
              { key: "careerus", label: "CareerUS", count: counts.careerus },
              { key: "custech", label: "CUSTECH", count: counts.custech },
            ] as { key: SourceFilter; label: string; count: number }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                filter === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs ${
                  filter === tab.key ? "text-primary" : "text-muted-foreground/70"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-80">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or position"
            className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{filtered.length}</span>{" "}
        of {submissions.length} submission
        {submissions.length === 1 ? "" : "s"}. Click a row for the full,
        readable view — scroll horizontally to see every column.
      </p>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm ring-1 ring-black/2 dark:bg-card">
        <div className="table-scroll max-h-[75vh] overflow-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 min-w-12 border-b border-r border-border bg-muted/60 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`border-b border-r border-border bg-muted/60 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm last:border-r-0 ${col.width}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((submission, index) => (
                <tr
                  key={submission.id}
                  className="group cursor-pointer bg-white transition-colors even:bg-muted/15 hover:bg-primary/5 dark:bg-card dark:even:bg-muted/10"
                  onClick={() => setSelected(submission)}
                >
                  <td className="sticky left-0 z-10 border-b border-r border-border bg-inherit px-2 py-1.5 text-center tabular-nums text-muted-foreground">
                    {index + 1}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      title={
                        typeof col.render(submission) === "string"
                          ? (col.render(submission) as string)
                          : undefined
                      }
                      className={`max-w-[320px] overflow-hidden truncate border-b border-r border-border px-3 py-1.5 text-foreground last:border-r-0 ${col.width}`}
                    >
                      {col.render(submission) || (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="border-b border-border px-4 py-14 text-center text-sm text-muted-foreground"
                  >
                    No applications found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <ApplicationDetail
          submission={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
