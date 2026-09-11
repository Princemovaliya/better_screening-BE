/** What the CandidateInterviewGuard attaches to `request.candidateSession` after
 * resolving a raw token. Every candidate-portal endpoint operates only on the
 * interview identified here — no interview/candidate id is ever accepted from the
 * request body/params, which is what closes off IDOR on this token-only auth model. */
export interface CandidateSessionContext {
  interviewId: string;
  candidateId: string;
  organizationId: string;
  tokenId: string;
}
