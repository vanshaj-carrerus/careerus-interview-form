import type { Metadata } from "next";
import { Suspense } from "react";
import { ApplicationsLoginForm } from "@/components/applications-login-form";

export const metadata: Metadata = {
  title: "Sign in — CareerUS Solutions",
  description: "Sign in to view interview application submissions.",
};

export const dynamic = "force-dynamic";

export default function ApplicationsLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-primary/5 via-background to-secondary/5 px-4 py-16">
      <Suspense fallback={null}>
        <ApplicationsLoginForm />
      </Suspense>
    </div>
  );
}
