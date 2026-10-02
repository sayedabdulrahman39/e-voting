import React, { useState, useEffect } from "react";
import {
  UserCheck,
  FileCheck2,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Copy,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  Clock,
} from "lucide-react";
import { ethers } from "ethers";
import { Candidate, Election, POLICY_TOPICS } from "../types";
import { computeManifestoHash } from "../lib/crypto";
import { saveFullCandidate } from "../lib/voterStorage";

interface CandidateDashboardProps {
  election: Election;
  candidate: Candidate;
  onUpdateCandidate: (updated: Candidate) => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  election,
  candidate,
  onUpdateCandidate,
}) => {
  const [displayName, setDisplayName] = useState(candidate.display_name);
  const [party, setParty] = useState(candidate.party);
  const [bio, setBio] = useState(candidate.bio);
  const [manifestoText, setManifestoText] = useState(candidate.manifesto_text);
  const [pdfUrl, setPdfUrl] = useState(candidate.pdf_url || "");
  const [pdfName, setPdfName] = useState(candidate.pdf_name || "");
  const [pdfUpdatedAt, setPdfUpdatedAt] = useState(candidate.pdf_updated_at || "");
  const [stances, setStances] = useState<number[]>(candidate.stance_vector);
  const [liveHash, setLiveHash] = useState(candidate.manifesto_hash || computeManifestoHash(candidate.manifesto_text));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (candidate) {
      setDisplayName(candidate.display_name || "");
      setParty(candidate.party || "");
      setBio(candidate.bio || "");
      setManifestoText(candidate.manifesto_text || "");
      setPdfUrl(candidate.pdf_url || "");
      setPdfName(candidate.pdf_name || "");
      setPdfUpdatedAt(candidate.pdf_updated_at || "");
      setStances(candidate.stance_vector || [3, 3, 3, 3, 3, 3]);
      setLiveHash(candidate.manifesto_hash || computeManifestoHash(candidate.manifesto_text || ""));
    }
  }, [candidate.id, candidate.pdf_url, candidate.pdf_name, candidate.manifesto_hash, candidate.manifesto_text]);

  useEffect(() => {
    if (!pdfName) {
      setLiveHash(computeManifestoHash(manifestoText));
    }
  }, [manifestoText, pdfName]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setPdfError("Please upload a valid PDF document (.pdf).");
      return;
    }

    setPdfError(null);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const hash = ethers.keccak256(bytes);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPdfUrl(dataUrl);
        setPdfName(file.name);
        const now = new Date().toISOString();
        setPdfUpdatedAt(now);
        setLiveHash(hash);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setPdfError("Failed to process PDF: " + (err.message || "Unknown error"));
    }
  };

  const handleRemovePdf = () => {
    setPdfUrl("");
    setPdfName("");
    setPdfUpdatedAt("");
    setLiveHash(computeManifestoHash(manifestoText));
  };

  const handleStanceChange = (index: number, val: number) => {
    const updated = [...stances];
    updated[index] = val;
    setStances(updated);
  };

  const handleSaveAndSubmit = () => {
    const updated: Candidate = {
      ...candidate,
      display_name: displayName,
      party,
      bio,
      manifesto_text: manifestoText,
      manifesto_hash: liveHash,
      pdf_url: pdfUrl || undefined,
      pdf_name: pdfName || undefined,
      pdf_updated_at: pdfUpdatedAt || undefined,
      stance_vector: stances,
      approved: false,
      attest_tx: undefined,
    };
    saveFullCandidate(updated);
    onUpdateCandidate(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-900/30 via-slate-900/60 to-slate-900/80 border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 badge-blue">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Candidate Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Candidate Profile & Manifesto Attestation
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Election: <strong className="text-white font-extrabold">{election.title}</strong> &bull; Changes made to your manifesto recalculate the on-chain cryptographic hash to guarantee tamper detection.
            </p>
          </div>

          {/* Attestation Status Badge */}
          <div className="p-4 rounded-2xl glass border border-white/10 flex flex-col justify-center space-y-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              On-Chain Status
            </span>
            {candidate.approved ? (
              <div className="flex items-center space-x-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <div>
                  <div className="text-xs font-bold">Attested & Verified</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Tx: {candidate.attest_tx?.slice(0, 10)}...{candidate.attest_tx?.slice(-8)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-amber-400">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <div className="text-xs font-bold">Pending Admin Attestation</div>
                  <div className="text-[10px] text-slate-400 font-medium">Submit changes to request review</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Manifesto Editor & Stance Survey */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Profile & Manifesto Editor */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
                <FileCheck2 className="w-4.5 h-4.5 text-cyan-400" />
                <span>Candidate Information & Manifesto</span>
              </h2>
              <span className="text-xs text-slate-400 font-semibold">Election ID: #{election.id}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Candidate Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Party / Platform</label>
                <input
                  type="text"
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  className="glass-input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Short Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Brief background and career summary..."
                className="glass-input text-xs resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Official Manifesto Statement (Text Summary)</label>
              <textarea
                value={manifestoText}
                onChange={(e) => setManifestoText(e.target.value)}
                rows={4}
                placeholder="Write your policy promises and manifesto vision here..."
                className="glass-input text-xs leading-relaxed"
              />
            </div>

            {/* PDF Manifesto Upload Component */}
            <div className="p-4 glass rounded-2xl space-y-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Upload Official Manifesto Document (PDF)</span>
                </span>
                <span className="text-[10px] text-slate-400">Optional (.pdf)</span>
              </div>

              {!pdfName ? (
                <div>
                  <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-white/20 hover:border-cyan-400/50 bg-slate-900/40 hover:bg-slate-900/60 cursor-pointer transition-all">
                    <Upload className="w-6 h-6 text-cyan-400 mb-1" />
                    <span className="text-xs font-bold text-slate-200">Click or Drag & Drop PDF Manifesto</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PDF will be hashed with Keccak-256 and verified for voters</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="p-3.5 glass-subtle rounded-xl border border-cyan-400/30 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 border border-cyan-400/30">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate flex items-center space-x-1.5">
                        <span>{pdfName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>Updated: {pdfUpdatedAt ? new Date(pdfUpdatedAt).toLocaleString() : "Just now"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        download={pdfName}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary py-1.5 px-2.5 text-[11px] flex items-center space-x-1"
                        title="Download / View PDF"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View</span>
                      </a>
                    )}
                    <button
                      onClick={handleRemovePdf}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                      title="Remove PDF"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {pdfError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                  {pdfError}
                </div>
              )}
            </div>

            {/* Cryptographic Hash Display */}
            <div className="p-4 glass rounded-2xl space-y-2 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Real-Time Keccak-256 Manifesto Hash:</span>
                <button
                  onClick={() => copyToClipboard(liveHash)}
                  className="btn-secondary py-1 px-2.5 text-[11px] flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedHash ? "Copied!" : "Copy Hash"}</span>
                </button>
              </div>
              <div className="font-mono text-xs text-cyan-300 break-all p-3 glass-subtle rounded-xl border border-white/10 font-bold">
                {liveHash}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {savedSuccess ? (
                <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Manifesto Saved & Hash Recalculated!</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  Saving will submit hash for on-chain attestation.
                </span>
              )}

              <button
                onClick={handleSaveAndSubmit}
                className="btn-primary text-xs py-2.5 px-6"
              >
                Save & Submit Manifesto
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Stance Matrix Survey */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card space-y-5">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Sliders className="w-4.5 h-4.5 text-cyan-400" />
                <span>Policy Stance Vector (1-5 Scale)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set your position on core issues to enable matching for voters in your constituency.
              </p>
            </div>

            <div className="space-y-4">
              {POLICY_TOPICS.map((topic, idx) => (
                <div key={topic.id} className="p-4 glass-subtle rounded-2xl space-y-2 border border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{topic.title}</span>
                    <span className="badge-blue text-[11px]">
                      Stance: {stances[idx]} / 5
                    </span>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={stances[idx]}
                    onChange={(e) => handleStanceChange(idx, Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono font-semibold">
                    <span>1: {topic.minLabel}</span>
                    <span>5: {topic.maxLabel}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveAndSubmit}
              className="btn-primary w-full py-3 text-xs"
            >
              Update Policy Stance Vector
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
