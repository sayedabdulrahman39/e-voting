import React from "react";
import {
  X,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Candidate } from "../types";

interface ManifestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
}

export const ManifestoModal: React.FC<ManifestoModalProps> = ({
  isOpen,
  onClose,
  candidate,
}) => {
  if (!isOpen || !candidate) return null;

  const handleDownloadText = () => {
    if (!candidate.manifesto_text) return;
    const content = `OFFICIAL CANDIDATE MANIFESTO
====================================
Election Candidate: ${candidate.display_name}
Party: ${candidate.party}
Constituency: ${candidate.constituency}
Email: ${candidate.email || "N/A"}
Keccak-256 Attestation Hash: ${candidate.manifesto_hash || "N/A"}
====================================

${candidate.manifesto_text}

====================================
Cryptographically Verified on VOTEX Platform
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifesto_${candidate.display_name.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-2xl p-6 sm:p-8 glass-strong rounded-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b border-white/10 pb-4 pr-8">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Official Candidate Manifesto & Policy Document</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            {candidate.display_name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <span className="badge-blue font-bold">{candidate.party}</span>
            <span className="text-slate-400 flex items-center gap-1 font-medium">
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>{candidate.constituency}</span>
            </span>
            {candidate.approved && (
              <span className="badge-green text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>On-Chain Attested</span>
              </span>
            )}
          </div>
        </div>

        {/* Cryptographic Keccak-256 Fingerprint */}
        {candidate.manifesto_hash && (
          <div className="p-3.5 glass rounded-2xl space-y-1 font-mono text-xs border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans font-bold text-cyan-400 uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Keccak-256 Cryptographic Fingerprint
              </span>
              <span className="text-[9px] text-slate-400 font-sans">SHA3 / EVM Native</span>
            </div>
            <div className="text-slate-300 break-all text-[11px] font-bold">
              {candidate.manifesto_hash}
            </div>
          </div>
        )}

        {/* Uploaded PDF Document Section */}
        {candidate.pdf_url ? (
          <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="font-bold text-white text-xs">
                    {candidate.pdf_name || "Official_Manifesto.pdf"}
                  </div>
                  {candidate.pdf_updated_at && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>Uploaded: {new Date(candidate.pdf_updated_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={candidate.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary py-1.5 px-3 text-xs flex items-center space-x-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open PDF</span>
                </a>
                <a
                  href={candidate.pdf_url}
                  download={candidate.pdf_name || "manifesto.pdf"}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>

            {/* Embedded PDF Preview */}
            <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900/80 h-72">
              <iframe
                src={candidate.pdf_url}
                title="Manifesto PDF Preview"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        ) : null}

        {/* Written Manifesto Text Section */}
        {candidate.manifesto_text ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Manifesto Statement:
              </span>
              <button
                onClick={handleDownloadText}
                className="btn-secondary py-1 px-2.5 text-[11px] flex items-center space-x-1"
              >
                <Download className="w-3 h-3" />
                <span>Download as .TXT</span>
              </button>
            </div>
            <div className="p-4 glass rounded-2xl border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-sans">
              "{candidate.manifesto_text}"
            </div>
          </div>
        ) : null}

        {!candidate.pdf_url && !candidate.manifesto_text && (
          <div className="p-8 text-center glass rounded-2xl border border-white/10 text-slate-400 text-xs space-y-1">
            <p className="font-semibold text-slate-300">No manifesto document attached yet.</p>
            <p>Candidate has not uploaded a PDF or entered policy statements.</p>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary py-2 px-5 text-xs font-bold"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
