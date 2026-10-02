import React from "react";
import {
  Shield,
  Vote,
  UserCheck,
  BarChart3,
  Database,
  LogIn,
  LogOut,
} from "lucide-react";
import { UserRole, Election } from "../types";
import { AuthUser } from "./AuthModal";

interface NavbarProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  activeElection: Election;
  elections: Election[];
  onSelectElection: (election: Election) => void;
  relayerStatus: "online" | "offline" | "checking";
  supabaseStatus: "connected" | "disconnected";
  authUser: AuthUser | null;
  onOpenAuth: (role?: UserRole) => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onSelectRole,
  activeElection,
  elections,
  onSelectElection,
  relayerStatus,
  supabaseStatus,
  authUser,
  onOpenAuth,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/70 backdrop-blur-2xl border-b border-white/10 shadow-lg transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-sky-400 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-white/20">
            <Vote className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white">VOTEX</span>
              <span className="badge-blue text-[10px]">
                ZKP E-VOTING
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Zero-Knowledge Digital Democracy</p>
          </div>
        </div>

        {/* Election Selector */}
        <div className="hidden md:flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-semibold">Election:</span>
          <select
            value={activeElection?.id}
            onChange={(e) => {
              const selected = elections.find((el) => el.id === Number(e.target.value));
              if (selected) onSelectElection(selected);
            }}
            className="glass-select py-1.5 px-3 text-xs font-semibold text-slate-100 max-w-[220px]"
          >
            {elections.map((el) => (
              <option key={el.id} value={el.id} className="bg-slate-900 text-white">
                {el.title} ({el.status})
              </option>
            ))}
          </select>
        </div>

        {/* Portal Nav Items */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 p-1 rounded-2xl bg-slate-900/60 border border-white/10 shadow-inner">
            <button
              onClick={() => onSelectRole("VOTER")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentRole === "VOTER"
                  ? "tab-active"
                  : "tab-inactive"
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voter Portal</span>
            </button>

            <button
              onClick={() => onSelectRole("CANDIDATE")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentRole === "CANDIDATE"
                  ? "tab-active"
                  : "tab-inactive"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Candidate Hub</span>
            </button>

            <button
              onClick={() => onSelectRole("ADMIN")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentRole === "ADMIN"
                  ? "tab-active"
                  : "tab-inactive"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Console</span>
            </button>

            <button
              onClick={() => onSelectRole("PUBLIC")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentRole === "PUBLIC"
                  ? "tab-active"
                  : "tab-inactive"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Results</span>
            </button>
          </div>

          {/* Status Badges */}
          <div className="hidden xl:flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-[11px] text-slate-300 font-medium">
              <Database className="w-3 h-3 text-emerald-400" />
              <span className="font-mono">
                {supabaseStatus === "connected" ? "Supabase: Realtime" : "Database: Ready"}
              </span>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-[11px] text-slate-300 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  relayerStatus === "online"
                    ? "bg-emerald-400 animate-pulse"
                    : relayerStatus === "checking"
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
              ></span>
              <span className="font-mono">Relayer: {relayerStatus === "online" ? ":3001" : "Local"}</span>
            </div>
          </div>

          {/* User Account / Auth Buttons */}
          <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
            {authUser ? (
              <div className="flex items-center space-x-2">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-bold text-white leading-none">{authUser.fullName}</span>
                  <span className="text-[10px] text-cyan-400 font-mono mt-0.5">{authUser.role}</span>
                </div>
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="btn-secondary px-3 py-1.5 text-xs flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth()}
                className="btn-primary py-1.5 px-4 text-xs flex items-center space-x-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Portal Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
