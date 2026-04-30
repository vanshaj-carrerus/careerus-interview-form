"use client";

import Image from "next/image";
import { useCallback, useState, type ReactNode } from "react";
import {
  initialInterviewFormFields,
  type InterviewFormFields,
} from "@/types/interview-form";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-[color,box-shadow,border-color] placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";
const skillSuggestions = [
  "English Speaking",
  "English Writing",
  "English Typing",
  "MS Word",
  "MS Excel",
  "Management Skills",
];

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 border-b-2 border-secondary/30 pb-2 text-sm font-bold uppercase tracking-[0.12em] text-secondary">
      {children}
    </h2>
  );
}

function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      {children}
    </div>
  );
}

export function InterviewApplicationForm() {
  const [fields, setFields] = useState<InterviewFormFields>(
    initialInterviewFormFields,
  );
  const [resume, setResume] = useState<File | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | boolean>(false);

  const update = useCallback(
    <K extends keyof InterviewFormFields>(
      key: K,
      value: InterviewFormFields[K],
    ) => {
      setFields((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const getStatusClasses = () => {
    if (status === "success") {
      return "border-green-500/30 bg-green-500/10 text-green-900";
    }
    if (status === "error") {
      return "border-destructive/40 bg-destructive/10 text-destructive";
    }
    if (status === "loading") {
      return "border-amber-500/30 bg-amber-500/10 text-amber-900";
    }
    return "border-border bg-muted/30 text-muted-foreground";
  };

  const getStatusMessage = () => {
    if (message) return message;
    return "Submission status will appear here after you submit.";
  };

  const validateRequiredFields = () => {
    if (!fields.fullName.trim()) return "Full name is required.";
    if (!fields.contactNumber.trim()) return "Contact number is required.";
    if (!fields.emailAddress.trim()) return "Email address is required.";
    if (!fields.salaryExpectations.trim()) return "Salary expectations are required.";
    if (!fields.nightShiftWilling) return "Please select night shift preference.";
    if (fields.skills.length === 0) return "Please add at least one skill.";
    if (!fields.joiningDate.trim()) return "Joining date is required.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    const validationError = validateRequiredFields();
    if (validationError) {
      setStatus("error");
      setMessage(validationError);
      return;
    }

    setStatus("loading");
    setMessage("Submitting application...");

    try {
      let resumeUrl = "";
      if (resume) {
        const fileData = new FormData();
        fileData.append("file", resume);

        const uploadResponse = await fetch("/api/upload-files", {
          method: "POST",
          body: fileData,
        });
        const uploadResult = (await uploadResponse.json()) as {
          url?: string | null;
          error?: string;
        };

        if (!uploadResponse.ok || !uploadResult.url) {
          throw new Error(uploadResult.error || "Resume upload failed.");
        }

        resumeUrl = uploadResult.url;
      }

      const now = new Date();
      const submittedAtIso = now.toISOString().replace(/\.\d{3}Z$/, "Z");

      const payload = {
        ...fields,
        resumeFileName: resume?.name ?? "",
        resumeUrl,
        submittedAt: submittedAtIso,
      };

      const response = await fetch("/api/interview-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || `Submission failed with status ${response.status}.`,
        );
      }

      setStatus("success");
      setMessage("Application submitted successfully.");
      setFields(initialInterviewFormFields);
      setResume(null);
      setSkillInput("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not submit right now. Please try again.",
      );
    }
  };

  const addSkill = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    if (
      fields.skills.some(
        (existing) => existing.toLowerCase() === clean.toLowerCase(),
      )
    ) {
      setSkillInput("");
      return;
    }
    update("skills", [...fields.skills, clean]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    update(
      "skills",
      fields.skills.filter((s) => s !== skill),
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-3xl space-y-10 px-4 pb-16 pt-8 sm:px-6"
      noValidate
    >
      <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            CareerU S Solutions
          </p>
          <h1 className="mt-2 text-2xl font-bold uppercase tracking-tight text-foreground sm:text-3xl">
            Job application form
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Candidate interview intake. Complete all sections; interviewer
            fields at the bottom.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <Image
            src="/logo.png"
            alt=""
            width={2000}
            height={2000}
            className="opacity-90 h-10 w-auto dark:invert object-contain"
            aria-hidden
          />
        </div>
      </header>
      {message && (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${getStatusClasses()}`}
          role={status === "error" ? "alert" : "status"}
        >
          {getStatusMessage()}
        </p>
      )}

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <FieldGroup
            label="Position applying for"
            htmlFor="positionApplyingFor"
          >
            <input
              id="positionApplyingFor"
              name="positionApplyingFor"
              type="text"
              autoComplete="organization-title"
              className={inputClass}
              value={fields.positionApplyingFor}
              onChange={(e) => {update("positionApplyingFor", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
          <FieldGroup label="Applying Date" htmlFor="date">
            <input
              id="date"
              name="date"
              type="date"
              className={inputClass}
              value={fields.date}
              onChange={(e) => {update("date", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <SectionTitle>Personal details</SectionTitle>
        <div className="grid gap-6">
          <FieldGroup label="Full name" htmlFor="fullName">
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              className={inputClass}
              value={fields.fullName}
              onChange={(e) => {update("fullName", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
          <div className="grid gap-6 sm:grid-cols-2">
            <FieldGroup label="Contact number" htmlFor="contactNumber">
              <input
                id="contactNumber"
                name="contactNumber"
                type="tel"
                autoComplete="tel"
                required
                className={inputClass}
                value={fields.contactNumber}
                onChange={(e) => {update("contactNumber", e.target.value); setMessage(false);}}
              />
            </FieldGroup>
            <FieldGroup label="Email address" htmlFor="emailAddress">
              <input
                id="emailAddress"
                name="emailAddress"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
                value={fields.emailAddress}
                onChange={(e) => {update("emailAddress", e.target.value); setMessage(false);}}
              />
            </FieldGroup>
          </div>
          <FieldGroup label="Current address" htmlFor="currentAddress">
            <textarea
              id="currentAddress"
              name="currentAddress"
              rows={3}
              className={`${inputClass} min-h-20 resize-y`}
              value={fields.currentAddress}
              onChange={(e) => {update("currentAddress", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <SectionTitle>About your application</SectionTitle>
        <div className="grid gap-6">
          <FieldGroup label="Why do you want to join us?" htmlFor="whyJoinUs">
            <textarea
              id="whyJoinUs"
              name="whyJoinUs"
              rows={4}
              className={`${inputClass} min-h-24 resize-y`}
              value={fields.whyJoinUs}
              onChange={(e) => {update("whyJoinUs", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
          <FieldGroup
            label="What do you know about this job role?"
            htmlFor="knowledgeOfJobRole"
          >
            <textarea
              id="knowledgeOfJobRole"
              name="knowledgeOfJobRole"
              rows={4}
              className={`${inputClass} min-h-24 resize-y`}
              value={fields.knowledgeOfJobRole}
              onChange={(e) => {update("knowledgeOfJobRole", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
          <FieldGroup
            label="Why do you want to change your current/last job?"
            htmlFor="whyChangeJob"
          >
            <textarea
              id="whyChangeJob"
              name="whyChangeJob"
              rows={4}
              className={`${inputClass} min-h-24 resize-y`}
              value={fields.whyChangeJob}
              onChange={(e) => {update("whyChangeJob", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
          <FieldGroup label="Why should we hire you?" htmlFor="whyHireYou">
            <textarea
              id="whyHireYou"
              name="whyHireYou"
              rows={4}
              className={`${inputClass} min-h-24 resize-y`}
              value={fields.whyHireYou}
              onChange={(e) => update("whyHireYou", e.target.value)}
            />
          </FieldGroup>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <SectionTitle>Employment details</SectionTitle>
        <div className="grid gap-6 sm:grid-cols-2">
          <FieldGroup
            label="Current / last employer"
            htmlFor="currentLastEmployer"
          >
            <input
              id="currentLastEmployer"
              name="currentLastEmployer"
              type="text"
              autoComplete="organization"
              className={inputClass}
              value={fields.currentLastEmployer}
              onChange={(e) => {update("currentLastEmployer", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
          <FieldGroup label="Salary expectations" htmlFor="salaryExpectations">
            <input
              id="salaryExpectations"
              name="salaryExpectations"
              type="text"
              inputMode="decimal"
              required
              className={inputClass}
              value={fields.salaryExpectations}
              onChange={(e) => {update("salaryExpectations", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <SectionTitle>General</SectionTitle>
        <div className="grid gap-6">
          <div className="space-y-2">
            <span className={labelClass}>
              Are you willing to work night shifts?
            </span>
            <div className="flex flex-wrap gap-3">
              {(["yes", "no"] as const).map((opt) => (
                <label
                  key={opt}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-[background-color,border-color,box-shadow] ${
                    fields.nightShiftWilling === opt
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="nightShiftWilling"
                    className="sr-only"
                    checked={fields.nightShiftWilling === opt}
                    onChange={() => {update("nightShiftWilling", opt); setMessage(false);}}
                  />
                  {opt === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>
          <FieldGroup
            label="What is your ideal work environment?"
            htmlFor="idealWorkEnvironment"
          >
            <textarea
              id="idealWorkEnvironment"
              name="idealWorkEnvironment"
              rows={4}
              className={`${inputClass} min-h-24 resize-y`}
              value={fields.idealWorkEnvironment}
              onChange={(e) => {update("idealWorkEnvironment", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <SectionTitle>Reference</SectionTitle>
        <FieldGroup
          label="Reference name & contact"
          htmlFor="referenceNameAndContact"
        >
          <textarea
            id="referenceNameAndContact"
            name="referenceNameAndContact"
            rows={3}
            className={`${inputClass} min-h-20 resize-y`}
            value={fields.referenceNameAndContact}
            onChange={(e) => {update("referenceNameAndContact", e.target.value); setMessage(false);}}
          />
        </FieldGroup>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <SectionTitle>Medical information</SectionTitle>
        <FieldGroup
          label="Any medical issues (if applicable)"
          htmlFor="medicalIssues"
        >
          <textarea
            id="medicalIssues"
            name="medicalIssues"
            rows={3}
            className={`${inputClass} min-h-20 resize-y`}
            value={fields.medicalIssues}
            onChange={(e) => {update("medicalIssues", e.target.value); setMessage(false);}}
          />
        </FieldGroup>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <SectionTitle>Skills</SectionTitle>
        <FieldGroup label="Add candidate skills" htmlFor="skillInput">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="skillInput"
              name="skillInput"
              list="skill-suggestions"
              type="text"
              value={skillInput}
              placeholder="e.g. HTML"
              className={inputClass}
              onChange={(e) => {setSkillInput(e.target.value); setMessage(false);}}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill(skillInput);
                }
              }}
            />
            <datalist id="skill-suggestions">
              {skillSuggestions.map((skill) => (
                <option value={skill} key={skill} />
              ))}
            </datalist>
            <button
              type="button"
              className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground shadow-sm transition hover:brightness-110"
              onClick={() => {addSkill(skillInput); setMessage(false);}}
            >
              Add
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Suggestions: {skillSuggestions.join(", ")}
          </p>
        </FieldGroup>
        <div className="mt-4 flex flex-wrap gap-2">
          {fields.skills.map((skill) => (
            <button
              key={skill}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground"
              onClick={() => {removeSkill(skill); setMessage(false);}}
              title="Remove skill"
            >
              {skill}
              <span aria-hidden>&times;</span>
            </button>
          ))}
          {fields.skills.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              No skills added yet.
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <SectionTitle>Documents & dates</SectionTitle>
        <div className="grid gap-6 sm:grid-cols-2">
          <FieldGroup label="Resume upload" htmlFor="resume">
            <input
              id="resume"
              name="resume"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              className={`${inputClass} cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/90`}
              onChange={(e) => setResume(e.target.files?.[0] ?? null)}
            />
            {resume ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Selected: {resume.name}
              </p>
            ) : null}
          </FieldGroup>
          <FieldGroup label="Joining date" htmlFor="joiningDate">
            <input
              id="joiningDate"
              name="joiningDate"
              type="date"
              required
              className={inputClass}
              value={fields.joiningDate}
              onChange={(e) => {update("joiningDate", e.target.value); setMessage(false);}}
            />
          </FieldGroup>
        </div>
      </section>

      
      {message && (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${getStatusClasses()}`}
          role={status === "error" ? "alert" : "status"}
        >
          {getStatusMessage()}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition-[background-color,border-color] hover:bg-muted"
          disabled={status === "loading"}
          onClick={() => {
            setFields(initialInterviewFormFields);
            setResume(null);
            setSkillInput("");
            setStatus("idle");
            setMessage(false);
          }}
        >
          Clear form
        </button>
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-[filter,transform] hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? "Submitting..." : "Submit application"}
        </button>
      </div>
    </form>
  );
}
