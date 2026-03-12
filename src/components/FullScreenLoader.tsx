import {
  Fingerprint,
  QrCode,
  Radio,
  Save,
  Trash2,
  Plus,
  Send,
  LogIn,
  FileBarChart,
  CheckCircle2,
  XCircle,
  UserPlus,
  RefreshCw,
  Database,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LoaderOperation =
  | "loading"
  | "saving"
  | "deleting"
  | "creating"
  | "submitting"
  | "authenticating"
  | "generating"
  | "approving"
  | "rejecting"
  | "enrolling"
  | "refreshing"
  | "qr-verify"
  | "manual-mark"
  | "load-sessions";

interface Config {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: "primary" | "emerald" | "destructive" | "amber" | "violet";
}

const CONFIGS: Record<LoaderOperation, Config> = {
  loading: {
    icon: Database,
    title: "Loading Data",
    subtitle: "Fetching records from the server…",
    color: "primary",
  },
  saving: {
    icon: Save,
    title: "Saving Changes",
    subtitle: "Persisting your updates to the database…",
    color: "primary",
  },
  deleting: {
    icon: Trash2,
    title: "Deleting Record",
    subtitle: "Removing data permanently from the system…",
    color: "destructive",
  },
  creating: {
    icon: Plus,
    title: "Creating Record",
    subtitle: "Initializing and storing the new entry…",
    color: "primary",
  },
  submitting: {
    icon: Send,
    title: "Submitting Request",
    subtitle: "Forwarding your application to the server…",
    color: "violet",
  },
  authenticating: {
    icon: LogIn,
    title: "Authenticating",
    subtitle: "Verifying credentials and establishing session…",
    color: "primary",
  },
  generating: {
    icon: FileBarChart,
    title: "Generating Report",
    subtitle: "Aggregating data and building your report…",
    color: "violet",
  },
  approving: {
    icon: CheckCircle2,
    title: "Approving Request",
    subtitle: "Processing approval and notifying the student…",
    color: "emerald",
  },
  rejecting: {
    icon: XCircle,
    title: "Rejecting Request",
    subtitle: "Processing rejection and notifying the student…",
    color: "destructive",
  },
  enrolling: {
    icon: UserPlus,
    title: "Enrolling Student",
    subtitle: "Registering student enrollment in the system…",
    color: "amber",
  },
  refreshing: {
    icon: RefreshCw,
    title: "Refreshing Data",
    subtitle: "Syncing latest records from the server…",
    color: "primary",
  },
  "qr-verify": {
    icon: QrCode,
    title: "Verifying QR Code",
    subtitle: "Decoding and authenticating session token…",
    color: "primary",
  },
  "manual-mark": {
    icon: Fingerprint,
    title: "Recording Attendance",
    subtitle: "Submitting your biometric presence to the server…",
    color: "emerald",
  },
  "load-sessions": {
    icon: Radio,
    title: "Loading Timetable",
    subtitle: "Fetching today's active class sessions…",
    color: "primary",
  },
};

const COLOR_MAP = {
  primary: {
    ring: "border-primary/25",
    dot: "bg-primary",
    bar: "bg-primary",
    iconBg: "bg-primary/10 border-primary/30",
    outerDash: "border-primary/40",
    innerDash: "border-primary/20",
    title: "text-foreground",
    iconColor: "text-primary",
  },
  emerald: {
    ring: "border-emerald-500/25",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    iconBg: "bg-emerald-500/10 border-emerald-500/30",
    outerDash: "border-emerald-500/40",
    innerDash: "border-emerald-500/20",
    title: "text-emerald-500",
    iconColor: "text-emerald-500",
  },
  destructive: {
    ring: "border-destructive/25",
    dot: "bg-destructive",
    bar: "bg-destructive",
    iconBg: "bg-destructive/10 border-destructive/30",
    outerDash: "border-destructive/40",
    innerDash: "border-destructive/20",
    title: "text-destructive",
    iconColor: "text-destructive",
  },
  amber: {
    ring: "border-amber-500/25",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    iconBg: "bg-amber-500/10 border-amber-500/30",
    outerDash: "border-amber-500/40",
    innerDash: "border-amber-500/20",
    title: "text-amber-500",
    iconColor: "text-amber-500",
  },
  violet: {
    ring: "border-violet-500/25",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
    iconBg: "bg-violet-500/10 border-violet-500/30",
    outerDash: "border-violet-500/40",
    innerDash: "border-violet-500/20",
    title: "text-violet-500",
    iconColor: "text-violet-500",
  },
};

interface FullScreenLoaderProps {
  show: boolean;
  operation?: LoaderOperation;
  label?: string;
}

export function FullScreenLoader({
  show,
  operation = "loading",
  label,
}: FullScreenLoaderProps) {
  if (!show || operation === "loading") return null;

  const cfg = CONFIGS[operation];
  const cl = COLOR_MAP[cfg.color];
  const Icon = cfg.icon;

  return (
<<<<<<< HEAD
    <div className="fixed inset-0 z-[9999] bg-background/90 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 animate-in fade-in duration-300 lg:pl-[16rem]">
=======
    <div className="absolute inset-0 z-[9999] bg-background/97 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 animate-in fade-in duration-150 rounded-[inherit]">
>>>>>>> parent of 9d789f4 (mobile changes)
      {/* Expanding rings + icon */}
      <div className="relative flex items-center justify-center">
        {[0, 0.3, 0.6].map((delay, i) => (
          <div
            key={i}
            className={`absolute w-36 h-36 rounded-full border ${cl.ring} animate-ring-pulse`}
            style={{ animationDelay: `${delay}s` }}
          />
        ))}

        <div
          className={`relative w-20 h-20 rounded-full border-2 ${cl.iconBg} flex items-center justify-center shadow-xl`}
        >
          <div
            className={`absolute inset-[-3px] rounded-full border-[2.5px] border-dashed ${cl.outerDash} animate-rotate-cw`}
          />
          <div
            className={`absolute inset-[6px] rounded-full border border-dashed ${cl.innerDash} animate-rotate-ccw`}
          />
          <div className="relative z-10">
            <Icon className={`h-8 w-8 ${cl.iconColor}`} />
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-1.5 px-8">
        <p
          className={`text-base font-black uppercase tracking-[0.16em] ${cl.title}`}
        >
          {label || cfg.title}
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`block w-1.5 h-1.5 rounded-full ${cl.dot} animate-bounce-dot`}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* Indeterminate bar */}
      <div className="w-48 h-px bg-border rounded-full overflow-hidden">
        <div
          className={`h-full ${cl.bar} animate-progress-indeterminate rounded-full`}
        />
      </div>
    </div>
  );
}
