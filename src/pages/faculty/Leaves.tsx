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
  Check,
  X,
  Loader2,
  Calendar,
  RefreshCw,
  FileText,
  Clock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leavesAPI } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function FacultyLeaves() {
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [processingLeaveId, setProcessingLeaveId] = useState<number | null>(
    null,
  );

  const {
    data: leavesData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["faculty", "pending-leaves"],
    queryFn: async () => {
      const resp = await leavesAPI.getLeaves({ status: "pending" });
      return resp.data.data.leaveApplications || [];
    },
  });

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

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
      queryClient.invalidateQueries({
        queryKey: ["faculty", "pending-leaves"],
      });
      refetch();
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
      queryClient.invalidateQueries({
        queryKey: ["faculty", "pending-leaves"],
      });
      refetch();
    },
    onError: () => {
      setProcessingLeaveId(null);
      toast.error("Failed to reject");
    },
  });

  const leaves = Array.isArray(leavesData) ? leavesData : [];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading leave requests...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {leaves.length} Pending Approvals // Faculty Review Portal
          </p>
          {(approveMutation.isPending || rejectMutation.isPending) && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {approveMutation.isPending
                ? "Approving leave request..."
                : "Rejecting leave request..."}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {leaves.length === 0 ? (
        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-success" />
              </div>
              <p className="text-base font-semibold text-foreground">
                All caught up
              </p>
              <p className="text-sm text-muted-foreground">
                No pending leave requests at this time
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border border-border shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/40 px-4 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Pending Approvals
                <span className="ml-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning dark:text-warning border border-warning/20 text-[11px] font-bold">
                  {leaves.length}
                </span>
              </CardTitle>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-mono">
                <Clock className="h-3 w-3" />
                Auto-refreshing every 5s
              </div>
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
                  <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11 text-right pr-6">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave: any) => {
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
                                leave.user?.id}
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
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">
                            {format(startDate, "MMM d")} –{" "}
                            {format(endDate, "MMM d, yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="truncate text-sm text-muted-foreground">
                          {leave.reason || "No reason provided"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-foreground">
                          {duration} {duration === 1 ? "day" : "days"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className="h-8 px-3 bg-success/10 hover:bg-success/20 text-success border border-success/20 hover:border-success/40 transition-all shadow-none"
                            onClick={() => approveMutation.mutate(leave.id)}
                            disabled={processingLeaveId !== null}
                            title="Approve"
                          >
                            {isProcessing && approveMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1" /> Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 bg-destructive/10 hover:bg-destructive/20 text-destructive dark:text-destructive/90 border border-destructive/20 hover:border-destructive/40 transition-all shadow-none"
                            onClick={() => rejectMutation.mutate(leave.id)}
                            disabled={processingLeaveId !== null}
                            title="Reject"
                          >
                            {isProcessing && rejectMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <X className="h-3.5 w-3.5 mr-1" /> Reject
                              </>
                            )}
                          </Button>
                        </div>
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
  );
}
