import { getMongoDb } from "@/lib/mongodb";
import type {
  ApplicationSubmission,
  SubmissionSource,
} from "@/types/application-submission";

const COLLECTION_NAME = "interview_submissions";

export async function saveInterviewSubmission(
  payload: Record<string, unknown>,
  submittedFrom: SubmissionSource,
) {
  const db = await getMongoDb();
  const doc = {
    ...payload,
    submittedFrom,
    createdAt: new Date(),
  };
  await db.collection(COLLECTION_NAME).insertOne(doc);
}

export async function listInterviewSubmissions(
  submittedFrom?: SubmissionSource,
): Promise<ApplicationSubmission[]> {
  const db = await getMongoDb();
  const filter = submittedFrom ? { submittedFrom } : {};
  const docs = await db
    .collection(COLLECTION_NAME)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    submittedFrom: (doc.submittedFrom as SubmissionSource) ?? "careerus",
    positionApplyingFor: doc.positionApplyingFor ?? "",
    date: doc.date ?? "",
    fullName: doc.fullName ?? "",
    contactNumber: doc.contactNumber ?? "",
    emailAddress: doc.emailAddress ?? "",
    currentAddress: doc.currentAddress ?? "",
    whyJoinUs: doc.whyJoinUs ?? "",
    knowledgeOfJobRole: doc.knowledgeOfJobRole ?? "",
    whyChangeJob: doc.whyChangeJob ?? "",
    whyHireYou: doc.whyHireYou ?? "",
    currentLastEmployer: doc.currentLastEmployer ?? "",
    salaryExpectations: doc.salaryExpectations ?? "",
    nightShiftWilling: doc.nightShiftWilling ?? "",
    idealWorkEnvironment: doc.idealWorkEnvironment ?? "",
    referenceNameAndContact: doc.referenceNameAndContact ?? "",
    medicalIssues: doc.medicalIssues ?? "",
    skills: Array.isArray(doc.skills) ? doc.skills : [],
    interviewerRemarks: doc.interviewerRemarks ?? "",
    interviewerName: doc.interviewerName ?? "",
    signature: doc.signature ?? "",
    joiningDate: doc.joiningDate ?? "",
    resumeFileName: doc.resumeFileName ?? "",
    resumeUrl: doc.resumeUrl ?? "",
    submittedAt: doc.submittedAt ?? "",
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  }));
}
