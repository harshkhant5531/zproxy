import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  X,
  Loader2,
  FileText,
  RefreshCw,
  Clock,
  Filter,
} from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leavesAPI } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";
import { LeaveStatus } from "@/lib/types";

interface LeaveApplication {
  id: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  user?: {
    id: number;
    username: string;
    studentProfile?: { fullName?: string; enrollmentNumber?: string };
  };
}

export default function AdminLeaves() {
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [processingLeaveId, setProcessingLeaveId] = useState<number | null>(
    null,
  );

  const {
    data: leavesData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin", "leaves", statusFilter],
    queryFn: async () => {
      const resp = await leavesAPI.getLeaves(
        statusFilter !== "all" ? { status: statusFilter } : {},
      );
      return resp.data.data.leaveApplications || resp.data.data || [];
    },
  });

  useEffect(() => {
    if (!autoRefresh || statusFilter !== "pending") return;
    const interval = setInterval(() => refetch(), 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, statusFilter, refetch]);

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      setProcessingLeaveId(id);
      return leavesAPI.updateLeave(id.toString(), { status: "approved" });
    },
    onSuccess: () => {
      setProcessingLeaveId(null);
      toast.success("Leave approved", {
        description: "Student has been notified",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "leaves"] });
    },
    onError: () => {
      setProcessingLeaveId(null);
      toast.error("Failed to approve");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      setProcessingLeaveId(id);
      return leavesAPI.updateLeave(id.toString(), { status: "rejected" });
    },
    onSuccess: () => {
      setProcessingLeaveId(null);
      toast.success("Leave rejected", {
        description: "Student has been notified",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "leaves"] });
    },
    onError: () => {
      setProcessingLeaveId(null);
      toast.error("Failed to reject");
    },
  });

  const leaves: LeaveApplication[] = Array.isArray(leavesData)
    ? leavesData
    : [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6" />
      </div>
    );
  }

  return (
    <>
      <FullScreenLoader show={isLoading} operation="loading" />
      <FullScreenLoader
        show={approveMutation.isPending}
        operation="approving"
      />
      <FullScreenLoader show={rejectMutation.isPending} operation="rejecting" />
      <div className="app-page">
        <div className="app-page-header">
          <div>
            <h1 className="page-header-title">Leave Approvals</h1>
            <p className="page-header-sub">
              {leaves.length} {statusFilter === "all" ? "Total" : statusFilter}{" "}
              Applications
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                toast.success("Refreshed");
              }}
              disabled={isFetching}
              className="gap-2 h-9 text-xs font-medium"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            {statusFilter === "pending" && (
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  autoRefresh
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground"
                }`}
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`}
                />
                Live {autoRefresh ? "ON" : "OFF"}
              </button>
            )}
          </div>
        </div>

        {leaves.length === 0 ? (
          <Card className="glass-card border-none">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <p className="text-base font-semibold text-foreground">
                  All caught up
                </p>
                <p className="text-sm text-muted-foreground">
                  No {statusFilter === "all" ? "" : statusFilter} leave requests
                  at this time
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card aura-glow border-none overflow-hidden">
            <CardHeader className="card-header-muted py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {statusFilter === "pending"
                    ? "Pending Approvals"
                    : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Applications`}
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning dark:text-warning border border-warning/20 text-[11px] font-bold">
                    {leaves.length}
                  </span>
                </CardTitle>
                {statusFilter === "pending" && autoRefresh && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-mono">
                    <Clock className="h-3 w-3" />
                    Auto-refreshing every 8s
                  </div>
                )}
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11 pl-6">
                      Student
                    </TableHead>
                    <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11">
                      Type
                    </TableHead>
                    <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11">
                      Duration
                    </TableHead>
                    <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11">
                      Reason
                    </TableHead>
                    <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11">
                      Days
                    </TableHead>
                    <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11">
                      Status
                    </TableHead>
                    <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11 text-right pr-6">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => {
                    const startDate = new Date(leave.startDate);
                    const endDate = new Date(leave.endDate);
                    const duration =
                      Math.ceil(
                        (endDate.getTime() - startDate.getTime()) /
                          (1000 * 60 * 60 * 24),
                      ) + 1;
                    const isProcessing = processingLeaveId === leave.id;

                    return (
                      <TableRow
                        key={leave.id}
                        className="border-border/30 hover:bg-muted/20 transition-colors group"
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-primary">
                                {(leave.user?.studentProfile?.fullName ||
                                  leave.user?.username ||
                                  "?")[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {leave.user?.studentProfile?.fullName ||
                                  leave.user?.username}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 font-mono truncate">
                                {leave.user?.studentProfile?.enrollmentNumber ||
                                  `ID: ${leave.user?.id}`}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
                            {leave.leaveType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">
                            <p>
                              {format(startDate, "MMM d")} –{" "}
                              {format(endDate, "MMM d, yyyy")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate">
                            {leave.reason}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-foreground">
                            {duration}d
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={leave.status} />
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          {leave.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-xs font-semibold border-success/30 text-emerald-600 dark:text-emerald-400 hover:bg-success/10 gap-1.5"
                                onClick={() => approveMutation.mutate(leave.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing && approveMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
                                onClick={() => rejectMutation.mutate(leave.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing && rejectMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 font-mono">
                              {leave.status === "approved"
                                ? "Approved"
                                : "Rejected"}{" "}
                              by Admin
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
