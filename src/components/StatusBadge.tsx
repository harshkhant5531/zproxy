import { cn } from "@/lib/utils";
import { AttendanceStatus, LeaveStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  present: {
    label: "Present",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  late: {
    label: "Late",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  absent: {
    label: "Absent",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dot: "bg-red-500",
  },
  pending: {
    label: "Pending",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
  },
  approved: {
    label: "Approved",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dot: "bg-red-500",
  },
};

export function StatusBadge({
  status,
}: {
  status: AttendanceStatus | LeaveStatus;
}) {
  const config = statusConfig[status];
  if (!config) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        config.className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", config.dot)}
      />
      {config.label}
    </Badge>
  );
}
