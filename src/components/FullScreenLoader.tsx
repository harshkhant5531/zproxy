import {
  Fingerprint,
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
  | "locating"
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
  locating: {
    icon: Radio,
    title: "Acquiring Location",
    subtitle: "Requesting GPS permission and locking your current position…",
    color: "amber",
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
  position?: "fixed" | "absolute";
  withSidebarOffset?: boolean;
}

export function FullScreenLoader({
  show,
  operation = "loading",
  label,
  position = "absolute",
  withSidebarOffset = false,
}: FullScreenLoaderProps) {
  if (!show) return null;

  const cfg = CONFIGS[operation] || CONFIGS.refreshing;
  const cl = COLOR_MAP[cfg.color];
  const Icon = cfg.icon;

  const positionClass = position === "absolute" ? "absolute" : "fixed";
  const anchorClass =
    position === "absolute" ? "top-3 right-3" : "top-4 right-4";
  const sidebarClass = withSidebarOffset ? "lg:right-6" : "";

  return (
    <div
      className={`${positionClass} ${anchorClass} z-[120] animate-in fade-in duration-200 ${sidebarClass}`}
    >
      <div className="pointer-events-none rounded-lg border border-border bg-card/95 shadow-md px-3 py-2 min-w-[220px]">
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 shrink-0 rounded-md border ${cl.iconBg} flex items-center justify-center`}
          >
            <Icon className={`h-4 w-4 ${cl.iconColor} animate-spin`} />
          </div>

          <div className="min-w-0">
            <p
              className={`text-[11px] font-bold uppercase tracking-wider leading-tight ${cl.title}`}
            >
              {label || cfg.title}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {cfg.subtitle}
            </p>
          </div>
        </div>

        <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full ${cl.bar} animate-progress-indeterminate rounded-full`}
          />
        </div>
      </div>
    </div>
  );
}
