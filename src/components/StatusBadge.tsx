import { cn } from "@/lib/utils";
import { AttendanceStatus, LeaveStatus } from "@/lib/types";

const statusConfig = {
  present: { label: "Present", className: "bg-success/15 text-success border-success/30" },
  late: { label: "Late", className: "bg-warning/15 text-warning border-warning/30" },
  absent: { label: "Absent", className: "bg-destructive/15 text-destructive border-destructive/30" },
  pending: { label: "Pending", className: "bg-info/15 text-info border-info/30" },
  approved: { label: "Approved", className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status }: { status: AttendanceStatus | LeaveStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}
