export type UserRole = "ADMIN" | "CANDIDATE" | "VOTER" | "PUBLIC";

export type ElectionStatus = "DRAFT" | "REGISTRATION" | "LOCKED" | "OPEN" | "CLOSED";

export interface Candidate {
  id: number;
  election_id: number;
  display_name: string;
  party: string;
  constituency: string;
  bio: string;
  avatar_url?: string;
  email?: string;
  password?: string;
  manifesto_text: string;
  manifesto_hash: string;
  pdf_url?: string;
  pdf_name?: string;
  pdf_updated_at?: string;
  attest_tx?: string;
  stance_vector: number[]; // 6 numbers, 1..5
  approved: boolean;
  votes_count: number;
}

export interface PerformanceMetrics {
  openedAt: string;
  closedAt: string;
  durationMinutes: number;
  durationFormatted: string;
  totalVotes: number;
  avgProofTimeMs: number;
  avgRelayLatencyMs: number;
  throughputVotesPerMin: number;
  closingTxHash: string;
  merkleRoot: string;
  verifiedNullifiersCount: number;
}

export interface Election {
  id: number;
  title: string;
  description: string;
  status: ElectionStatus;
  merkle_root?: string;
  tree_depth: number;
  starts_at: string;
  ends_at: string;
  opened_at?: string;
  closed_at?: string;
  candidates: Candidate[];
  commitments: string[];
  metrics?: PerformanceMetrics;
}

export interface VoterRecord {
  id: string;
  voterIdNumber: string;
  fullName: string;
  email: string;
  constituency: string;
  hasVoted: boolean;
  electionId: number;
  otpCode?: string;
  otpExpiresAt?: string;
}

export interface VoterIdentity {
  secret: string;
  commitment: string;
  electionId: number;
  voterIdNumber: string;
  constituency: string;
  backupDownloaded: boolean;
  hasVoted?: boolean;
}

export interface VoteReceipt {
  electionId: number;
  electionTitle: string;
  candidateId: number;
  candidateName: string;
  constituency: string;
  nullifier: string;
  txHash: string;
  timestamp: string;
  merkleRoot: string;
  proofTimeMs?: number;
}

export interface AuditLogItem {
  id: number;
  electionId: number;
  stage: string;
  txHash: string;
  timestamp: string;
  details: string;
}

export interface PolicyTopic {
  id: number;
  title: string;
  description: string;
  minLabel: string;
  maxLabel: string;
}

export const CONSTITUENCIES = [
  "North Metro District",
  "South Central District",
  "East Bay District",
];

export const POLICY_TOPICS: PolicyTopic[] = [
  {
    id: 0,
    title: "1. Economic Policy & Taxation",
    description: "Progressive taxation and public welfare vs. Free-market deregulation & tax cuts",
    minLabel: "Free-Market / Low Tax",
    maxLabel: "Progressive Welfare / Public Focus",
  },
  {
    id: 1,
    title: "2. Clean Energy & Climate Action",
    description: "Aggressive renewable energy transition targets vs. Traditional fossil fuel security",
    minLabel: "Prioritize Conventional Energy",
    maxLabel: "100% Rapid Clean Energy Transition",
  },
  {
    id: 2,
    title: "3. Healthcare Accessibility",
    description: "Universal public healthcare guarantee vs. Private insurance competition",
    minLabel: "Private / Market Driven",
    maxLabel: "Universal Public Healthcare",
  },
  {
    id: 3,
    title: "4. Tech Innovation & AI Governance",
    description: "Strict safety audits and regulation vs. Rapid open-source technological acceleration",
    minLabel: "Minimal Regulation / Fast Tech",
    maxLabel: "Strict AI Safety & Compliance",
  },
  {
    id: 4,
    title: "5. Higher Education & Student Debt",
    description: "Tuition subsidies and student debt relief vs. Self-funded market-driven education",
    minLabel: "Market-Rate / Independent",
    maxLabel: "State Subsidized / Debt Relief",
  },
  {
    id: 5,
    title: "6. Data Privacy & Digital Rights",
    description: "Strict decentralized citizen data privacy rights vs. State cybersecurity monitoring",
    minLabel: "Security / State Oversight",
    maxLabel: "Total Decentralized Citizen Privacy",
  },
];
