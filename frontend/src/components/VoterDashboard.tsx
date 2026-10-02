import React, { useState, useEffect } from "react";
import {
  Vote,
  Key,
  Download,
  CheckCircle2,
  Sliders,
  Sparkles,
  Shield,
  AlertTriangle,
  Send,
  Check,
  MapPin,
  Copy,
  Eye,
} from "lucide-react";
import { Election, VoterIdentity, VoteReceipt, POLICY_TOPICS, Candidate } from "../types";
import { ManifestoModal } from "./ManifestoModal";
import {
  generateRandomSecret,
  computeCommitment,
  computeNullifier,
} from "../lib/crypto";
import { calculateCosineSimilarity } from "../lib/similarity";
import { AuthUser } from "./AuthModal";

interface VoterDashboardProps {
  election: Election;
  voterIdentity: VoterIdentity | null;
  onSetVoterIdentity: (identity: VoterIdentity) => void;
  onRegisterCommitment: (commitment: string) => void;
  onCastVote: (candidateId: number, nullifier: string, constituency: string) => Promise<{ txHash: string; proofTimeMs: number }>;
  receipts: VoteReceipt[];
  authUser: AuthUser | null;
}

export const VoterDashboard: React.FC<VoterDashboardProps> = ({
  election,
  voterIdentity,
  onSetVoterIdentity,
  onRegisterCommitment,
  onCastVote,
  receipts,
  authUser,
}) => {
  const userConstituency = authUser?.constituency || voterIdentity?.constituency || "North Metro District";
  const existingReceipt = receipts.find((r) => r.electionId === election.id);
  const hasAlreadyVoted = Boolean(voterIdentity?.hasVoted || existingReceipt);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(hasAlreadyVoted ? 4 : 1);
  const [secretInput, setSecretInput] = useState(voterIdentity?.secret || "");
  const [commitmentInput, setCommitmentInput] = useState(voterIdentity?.commitment || "");
  const [backupDownloaded, setBackupDownloaded] = useState(voterIdentity?.backupDownloaded || false);
  const [surveyResponses, setSurveyResponses] = useState<number[]>([3, 3, 3, 3, 3, 3]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<VoteReceipt | null>(existingReceipt || null);
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);

  // Filter candidates running in the voter's constituency
  const constituencyCandidates = election.candidates.filter(
    (c) => c.constituency === userConstituency || c.constituency === "General"
  );

  useEffect(() => {
    if (voterIdentity) {
      setSecretInput(voterIdentity.secret);
      setCommitmentInput(voterIdentity.commitment);
      setBackupDownloaded(voterIdentity.backupDownloaded);
      if (voterIdentity.hasVoted || existingReceipt) {
        setStep(4);
        if (existingReceipt) setLastReceipt(existingReceipt);
      } else if (election.commitments.includes(voterIdentity.commitment)) {
        setStep(3);
      }
    }
  }, [voterIdentity, election, existingReceipt]);

  const handleGenerateSecret = () => {
    const sec = generateRandomSecret();
    const comm = computeCommitment(sec);
    setSecretInput(sec);
    setCommitmentInput(comm);
    setBackupDownloaded(false);
  };

  const [copiedCredentials, setCopiedCredentials] = useState(false);

  const handleCopyCredentials = async () => {
    const textToCopy = `=== VOTEX VOTER IDENTITY CREDENTIALS ===
Election: ${election.title} (ID: ${election.id})
Voter ID: ${authUser?.voterIdNumber || "VOT-2026-XXX"}
Constituency: ${userConstituency}
Voter Private Secret: ${secretInput}
Public Poseidon Commitment: ${commitmentInput}
Timestamp: ${new Date().toISOString()}
=========================================
⚠️ KEEP YOUR SECRET SAFE AND CONFIDENTIAL.`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedCredentials(true);
      setBackupDownloaded(true);
      const updatedId: VoterIdentity = {
        secret: secretInput,
        commitment: commitmentInput,
        electionId: election.id,
        voterIdNumber: authUser?.voterIdNumber || "VOT-2026-001",
        constituency: userConstituency,
        backupDownloaded: true,
        hasVoted: false,
      };
      onSetVoterIdentity(updatedId);
      setTimeout(() => setCopiedCredentials(false), 4000);
    } catch {
      setBackupDownloaded(true);
    }
  };

  const handleDownloadBackup = () => {
    const backupData = {
      app: "VOTEX-Poseidon-ZKP",
      electionId: election.id,
      electionTitle: election.title,
      voterIdNumber: authUser?.voterIdNumber || "VOT-2026-XXX",
      constituency: userConstituency,
      secret: secretInput,
      commitment: commitmentInput,
      timestamp: new Date().toISOString(),
      warning: "NEVER SHARE YOUR SECRET. Anyone with this secret can nullify or cast your ballot.",
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `votex_backup_${authUser?.voterIdNumber || "voter"}_${secretInput.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setBackupDownloaded(true);
    const updatedId: VoterIdentity = {
      secret: secretInput,
      commitment: commitmentInput,
      electionId: election.id,
      voterIdNumber: authUser?.voterIdNumber || "VOT-2026-001",
      constituency: userConstituency,
      backupDownloaded: true,
      hasVoted: false,
    };
    onSetVoterIdentity(updatedId);
  };

  const handleSubmitCommitment = () => {
    if (!backupDownloaded) return;
    onRegisterCommitment(commitmentInput);
    setStep(3);
  };

  const handleSurveyChange = (index: number, val: number) => {
    const updated = [...surveyResponses];
    updated[index] = val;
    setSurveyResponses(updated);
  };

  const handleCastBallot = async () => {
    if (!selectedCandidateId || !secretInput) return;
    setIsSubmittingVote(true);
    setVoteError(null);

    try {
      if (election.status !== "OPEN") {
        throw new Error(`Voting is not open. Current election stage is: ${election.status}`);
      }

      if (hasAlreadyVoted) {
        throw new Error("You have already voted in this election. Duplicate voting is rejected.");
      }

      const isCommitted = election.commitments.includes(commitmentInput);
      if (!isCommitted) {
        throw new Error("Your commitment was not found in the locked Merkle tree. Please ensure you submitted your commitment.");
      }

      const nullifier = computeNullifier(secretInput, election.id);
      const res = await onCastVote(selectedCandidateId, nullifier, userConstituency);

      const candidate = election.candidates.find((c) => c.id === selectedCandidateId);
      const receipt: VoteReceipt = {
        electionId: election.id,
        electionTitle: election.title,
        candidateId: selectedCandidateId,
        candidateName: candidate?.display_name || "Candidate",
        constituency: userConstituency,
        nullifier,
        txHash: res.txHash,
        timestamp: new Date().toISOString(),
        merkleRoot: election.merkle_root || "0x0",
        proofTimeMs: res.proofTimeMs,
      };

      setLastReceipt(receipt);
      const updatedIdentity: VoterIdentity = {
        secret: secretInput,
        commitment: commitmentInput,
        electionId: election.id,
        voterIdNumber: authUser?.voterIdNumber || "VOT-2026-001",
        constituency: userConstituency,
        backupDownloaded: true,
        hasVoted: true,
      };
      onSetVoterIdentity(updatedIdentity);
      setStep(4);
    } catch (err: any) {
      setVoteError(err.message || "Failed to submit vote proof.");
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const candidateScores = constituencyCandidates.map((c) => ({
    ...c,
    similarity: calculateCosineSimilarity(surveyResponses, c.stance_vector),
  })).sort((a, b) => b.similarity - a.similarity);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-900/30 via-slate-900/60 to-slate-900/80 border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 badge-blue">
              <Vote className="w-3.5 h-3.5" />
              <span>Voter Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Private & Verifiable Zero-Knowledge Voting
            </h1>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <span className="text-slate-300 font-medium">
                Voter: <strong className="text-white font-extrabold">{authUser ? authUser.fullName : "Alice Johnson"}</strong>{" "}
                <span className="font-mono text-cyan-400 font-bold">({authUser?.voterIdNumber || "VOT-2026-001"})</span>
              </span>
              <span className="badge-purple font-semibold flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-purple-400" />
                <span>Constituency: {userConstituency}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="p-3.5 rounded-2xl glass border border-white/10 text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Election Stage</div>
              <div
                className={`text-xs font-extrabold font-mono mt-0.5 ${
                  election.status === "OPEN" ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {election.status}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { num: 1, title: "1. Secret & Backup", desc: "Local Identity Key" },
          { num: 2, title: "2. Commitment", desc: "Public Registration" },
          { num: 3, title: "3. Stance Matching", desc: `Candidates (${constituencyCandidates.length})` },
          { num: 4, title: "4. ZK Ballot & Receipt", desc: "Cast Anonymous Vote" },
        ].map((s) => {
          const isActive = step === s.num;
          const isCompleted = (step > s.num) || (s.num === 4 && hasAlreadyVoted);
          return (
            <button
              key={s.num}
              onClick={() => {
                if (!hasAlreadyVoted || s.num === 4) {
                  setStep(s.num as any);
                }
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isActive
                  ? "tab-active shadow-md shadow-blue-500/20"
                  : isCompleted
                  ? "glass border-emerald-500/30 text-slate-200"
                  : "glass-subtle text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-0.5">
                <span>{s.title}</span>
                {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
              <div className="text-[10px] opacity-80">{s.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Step 1: Secret & Mandatory Backup */}
      {step === 1 && (
        <div className="glass-card max-w-3xl mx-auto space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-lg font-extrabold text-white flex items-center space-x-2">
              <Key className="w-5 h-5 text-cyan-400" />
              <span>Step 1: In-Browser Cryptographic Identity Generation</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Your secret is generated strictly inside your browser memory and is <strong>never sent to any server or database</strong>.
            </p>
          </div>

          {!secretInput ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl glass text-cyan-400 flex items-center justify-center mx-auto border border-cyan-400/30 shadow-md">
                <Key className="w-8 h-8" />
              </div>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Click below to generate your 256-bit voter secret and Poseidon commitment for <strong className="text-cyan-400 font-bold">{userConstituency}</strong>.
              </p>
              <button
                onClick={handleGenerateSecret}
                className="btn-primary text-xs py-3 px-6"
              >
                Generate Voter Secret & Commitment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 glass rounded-2xl space-y-2 border border-white/10">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-bold">Your Private Secret (Keep Safe & Confidential):</span>
                  <span className="badge-red text-[10px]">NEVER SHARE</span>
                </div>
                <div className="font-mono text-xs text-cyan-300 break-all p-3 glass-subtle rounded-xl border border-white/10 font-bold">
                  {secretInput}
                </div>
              </div>

              <div className="p-4 glass rounded-2xl space-y-2 border border-white/10">
                <span className="text-slate-300 text-xs font-bold block">
                  Public Poseidon Commitment = Poseidon(secret):
                </span>
                <div className="font-mono text-xs text-purple-300 break-all p-3 glass-subtle rounded-xl border border-white/10 font-bold">
                  {commitmentInput}
                </div>
              </div>

              {/* Copy Voter ID & Credentials Requirement */}
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-cyan-300 text-xs font-bold">
                    <Copy className="w-4 h-4 text-cyan-400" />
                    <span>Copy & Save Voter Credentials</span>
                  </div>
                  {copiedCredentials && (
                    <span className="badge-green text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Copied to Clipboard!
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Copy your voter secret and Poseidon commitment to your clipboard. You need your secret to generate your zero-knowledge proof when casting your ballot.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={handleCopyCredentials}
                    className="btn-primary flex-1 py-3 px-4 text-xs flex items-center justify-center space-x-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="font-bold">
                      {copiedCredentials ? "✓ Credentials Copied!" : "Copy Voter ID & Credentials"}
                    </span>
                  </button>
                  <button
                    onClick={handleDownloadBackup}
                    className="btn-secondary py-3 px-3 text-xs flex items-center justify-center space-x-1.5"
                    title="Optional JSON backup"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON File</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  disabled={!backupDownloaded}
                  onClick={() => setStep(2)}
                  className="btn-primary text-xs py-2.5 px-6"
                >
                  Proceed to Registration &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Submit Commitment */}
      {step === 2 && (
        <div className="glass-card max-w-2xl mx-auto space-y-6">
          <div className="border-b border-white/10 pb-3">
            <h2 className="text-lg font-extrabold text-white flex items-center space-x-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span>Step 2: Submit Commitment to Public Voter Registry</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Your commitment is published to the public list. No personal name or identity is attached.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass font-mono text-xs space-y-2 border border-white/10">
            <span className="text-slate-400 block text-[11px] font-sans font-semibold">Commitment Hash to Publish:</span>
            <span className="text-cyan-300 break-all font-bold">{commitmentInput}</span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-300 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Identity secret is safely backed up in your local storage</span>
          </div>

          <button
            onClick={handleSubmitCommitment}
            className="btn-primary w-full py-3 text-xs"
          >
            Submit Commitment to Election #{election.id}
          </button>
        </div>
      )}

      {/* Step 3: Stance Survey with Constituency Filtering */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <span>Step 3: Advisory Policy Stance Survey ({userConstituency})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Showing candidates running in <strong className="text-cyan-400 font-bold">{userConstituency}</strong>. Cosine similarity calculates your alignment score.
              </p>
            </div>
            <button
              onClick={() => setStep(4)}
              className="btn-primary text-xs py-2 px-4 flex items-center space-x-1.5"
            >
              <span>Skip to Ballot</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              {POLICY_TOPICS.map((topic, idx) => (
                <div key={topic.id} className="glass-card space-y-2 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-white">{topic.title}</span>
                    <span className="badge-blue text-[11px]">
                      Your Position: {surveyResponses[idx]} / 5
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">{topic.description}</p>

                  <div className="pt-2">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={surveyResponses[idx]}
                      onChange={(e) => handleSurveyChange(idx, Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1 font-semibold">
                      <span>1: {topic.minLabel}</span>
                      <span>5: {topic.maxLabel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="glass-card space-y-4 sticky top-24">
                <div className="border-b border-white/10 pb-2">
                  <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Candidate Stance Alignment ({userConstituency})</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 block">Computed locally via Mean-Centered Cosine Similarity</span>
                </div>

                <div className="space-y-3">
                  {candidateScores.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCandidateId(c.id);
                        setStep(4);
                      }}
                      className="glass-card-hover p-4 space-y-3 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{c.display_name}</h4>
                          <p className="text-xs text-cyan-400 font-bold">{c.party}</p>
                        </div>
                        <span className="badge-blue text-xs font-mono">
                          {Math.round(c.similarity)}% Match
                        </span>
                      </div>

                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${Math.max(0, Math.min(100, Math.round(c.similarity)))}%` }}
                        />
                      </div>

                      {c.manifesto_text && (
                        <p className="text-[11px] text-slate-300 line-clamp-2 italic pt-1 border-t border-white/5">
                          "{c.manifesto_text}"
                        </p>
                      )}

                      {/* View Manifesto / Document Action */}
                      <div className="pt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setViewingCandidate(c)}
                          className="btn-secondary flex-1 py-1.5 px-2.5 text-[11px] flex items-center justify-center space-x-1.5"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>View Manifesto Document {c.pdf_url ? "(PDF Attached)" : ""}</span>
                        </button>
                        {c.pdf_url && (
                          <a
                            href={c.pdf_url}
                            download={c.pdf_name || "manifesto.pdf"}
                            className="btn-secondary py-1.5 px-2.5 text-[11px] flex items-center justify-center space-x-1"
                            title="Direct Download PDF"
                          >
                            <Download className="w-3 h-3 text-cyan-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Cast Ballot & Receipt */}
      {step === 4 && (
        <div className="space-y-6">
          {hasAlreadyVoted && lastReceipt ? (
            <div className="glass-card max-w-2xl mx-auto space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-white">Ballot Cast & Recorded On-Chain</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Your vote was anonymously verified using Zero-Knowledge Proofs.
                </p>
              </div>

              <div className="p-5 glass rounded-2xl text-left space-y-3 text-xs border border-white/10">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-400 font-semibold">Election:</span>
                  <span className="font-bold text-white">{lastReceipt.electionTitle}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-400 font-semibold">Candidate Voted:</span>
                  <span className="font-bold text-cyan-400">{lastReceipt.candidateName}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-400 font-semibold">Constituency:</span>
                  <span className="font-bold text-white">{lastReceipt.constituency}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2 font-mono">
                  <span className="text-slate-400 font-sans font-semibold">Nullifier Hash:</span>
                  <span className="text-slate-300 break-all text-[11px] font-bold">{lastReceipt.nullifier.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-400 font-sans font-semibold">Transaction Tx:</span>
                  <span className="text-cyan-400 break-all text-[11px] font-bold">{lastReceipt.txHash.slice(0, 16)}...</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card max-w-3xl mx-auto space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
                  <Send className="w-5 h-5 text-cyan-400" />
                  <span>Step 4: Select Candidate & Generate Zero-Knowledge Ballot</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Choose your candidate below for <strong className="text-cyan-400 font-bold">{userConstituency}</strong>.
                </p>
              </div>

              {voteError && (
                <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{voteError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {constituencyCandidates.map((c) => {
                  const isSelected = selectedCandidateId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCandidateId(c.id)}
                      className={`glass-card-hover p-5 space-y-3 ${
                        isSelected
                          ? "ring-2 ring-cyan-400 glass-strong shadow-lg shadow-cyan-500/25"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-extrabold text-white text-base">{c.display_name}</h3>
                          <p className="text-xs text-cyan-400 font-bold">{c.party}</p>
                        </div>
                        {isSelected && (
                          <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-cyan-500/30">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                      {c.manifesto_text && (
                        <p className="text-xs text-slate-300 line-clamp-2 italic">"{c.manifesto_text}"</p>
                      )}

                      {/* View Manifesto / Document Action */}
                      <div className="pt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setViewingCandidate(c)}
                          className="btn-secondary flex-1 py-1.5 px-2.5 text-xs flex items-center justify-center space-x-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>View Manifesto Document {c.pdf_url ? "(PDF Attached)" : ""}</span>
                        </button>
                        {c.pdf_url && (
                          <a
                            href={c.pdf_url}
                            download={c.pdf_name || "manifesto.pdf"}
                            className="btn-secondary py-1.5 px-2.5 text-xs flex items-center justify-center space-x-1"
                            title="Direct Download PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/10">
                <button
                  disabled={!selectedCandidateId || isSubmittingVote}
                  onClick={handleCastBallot}
                  className="btn-primary w-full py-3.5 text-sm flex items-center justify-center space-x-2"
                >
                  <Vote className="w-5 h-5" />
                  <span>{isSubmittingVote ? "Generating ZK Proof & Relaying..." : "Cast Anonymous ZK Ballot"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manifesto & Document Modal */}
      <ManifestoModal
        isOpen={Boolean(viewingCandidate)}
        onClose={() => setViewingCandidate(null)}
        candidate={viewingCandidate}
      />
    </div>
  );
};
