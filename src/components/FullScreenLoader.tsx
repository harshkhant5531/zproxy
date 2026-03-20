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
  color: "primary" | "success" | "destructive" | "warning" | "accent";
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
    color: "accent",
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
    color: "accent",
  },
  approving: {
    icon: CheckCircle2,
    title: "Approving Request",
    subtitle: "Processing approval and notifying the student…",
    color: "success",
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
    color: "warning",
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
    color: "warning",
  },
  "manual-mark": {
    icon: Fingerprint,
    title: "Recording Attendance",
    subtitle: "Submitting your biometric presence to the server…",
    color: "success",
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
  success: {
    ring: "border-success/25",
    dot: "bg-success",
    bar: "bg-success",
    iconBg: "bg-success/10 border-success/30",
    outerDash: "border-success/40",
    innerDash: "border-success/20",
    title: "text-success",
    iconColor: "text-success",
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
  warning: {
    ring: "border-warning/25",
    dot: "bg-warning",
    bar: "bg-warning",
    iconBg: "bg-warning/10 border-warning/30",
    outerDash: "border-warning/40",
    innerDash: "border-warning/20",
    title: "text-warning",
    iconColor: "text-warning",
  },
  accent: {
    ring: "border-accent/25",
    dot: "bg-accent",
    bar: "bg-accent",
    iconBg: "bg-accent/10 border-accent/30",
    outerDash: "border-accent/40",
    innerDash: "border-accent/20",
    title: "text-accent",
    iconColor: "text-accent",
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
