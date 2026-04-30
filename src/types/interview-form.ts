/**
 * Serializable candidate + interviewer fields aligned with the paper form
 * and Google Sheets column keys (camelCase).
 */
export interface InterviewFormFields {
  positionApplyingFor: string;
  /** Application / interview date */
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
}

export const initialInterviewFormFields: InterviewFormFields = {
  positionApplyingFor: "",
  date: "",
  fullName: "",
  contactNumber: "",
  emailAddress: "",
  currentAddress: "",
  whyJoinUs: "",
  knowledgeOfJobRole: "",
  whyChangeJob: "",
  whyHireYou: "",
  currentLastEmployer: "",
  salaryExpectations: "",
  nightShiftWilling: "",
  idealWorkEnvironment: "",
  referenceNameAndContact: "",
  medicalIssues: "",
  skills: [],
  interviewerRemarks: "",
  interviewerName: "",
  signature: "",
  joiningDate: "",
};
