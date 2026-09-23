/**
 * Shape of a stored interview application submission, common to both the
 * CareerUS homepage form and the CUSTECH form. `submittedFrom` is the only
 * field that differentiates which form a submission came from.
 */
export type SubmissionSource = "careerus" | "custech";

export interface ApplicationSubmission {
  id: string;
  submittedFrom: SubmissionSource;
  positionApplyingFor: string;
  date: string;
  fullName: string;
  contactNumber: string;
  emailAddress: string;
  currentAddress: string;
  whyJoinUs: string;
  knowledgeOfJobRole: string;
  whyChangeJob: string;
  whyHireYou: string;
  currentLastEmployer: string;
  salaryExpectations: string;
  nightShiftWilling: "yes" | "no" | "";
  idealWorkEnvironment: string;
  referenceNameAndContact: string;
  medicalIssues: string;
  skills: string[];
  interviewerRemarks: string;
  interviewerName: string;
  signature: string;
  joiningDate: string;
  resumeFileName: string;
  resumeUrl: string;
  submittedAt: string;
  createdAt: string;
}
