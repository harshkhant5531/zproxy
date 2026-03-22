import { cn } from "@/lib/utils";
import { AttendanceStatus, LeaveStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  present: {
    label: "Present",
    className:
      "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  late: {
    label: "Late",
    className:
      "bg-warning/10 text-warning border-warning/20",
    dot: "bg-warning",
  },
  absent: {
    label: "Absent",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
  },
  pending: {
    label: "Pending",
    className: "bg-info/10 text-info border-info/20",
    dot: "bg-info",
  },
  approved: {
    label: "Approved",
    className:
      "bg-success/10 text-success border-success/20",
    dot: "bg-success",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
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
