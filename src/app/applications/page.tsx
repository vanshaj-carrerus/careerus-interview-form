import type { Metadata } from "next";
import { isMongoConfigured } from "@/lib/mongodb";
import { listInterviewSubmissions } from "@/lib/interview-submissions";
import { ApplicationsList } from "@/components/applications-list";

export const metadata: Metadata = {
  title: "Applications — CareerUS Solutions",
  description: "All interview application submissions.",
};

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const mongoConfigured = isMongoConfigured();
  const submissions = mongoConfigured
    ? await listInterviewSubmissions()
    : [];

  return (
    <div className="min-h-full bg-linear-to-b from-primary/5 via-background to-secondary/5">
      <ApplicationsList
        initialSubmissions={submissions}
        mongoConfigured={mongoConfigured}
      />
    </div>
  );
}
