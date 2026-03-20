import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { FileText, Upload, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leavesAPI } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function LeaveManagement() {
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const { data: leavesData, isLoading } = useQuery({
    queryKey: ["student", "leaves"],
    queryFn: async () => {
      const resp = await leavesAPI.getLeaves();
      return resp.data.data.leaveApplications || resp.data.data;
    },
  });

  const studentLeaves = Array.isArray(leavesData) ? leavesData : [];

  const createLeaveMutation = useMutation({
    mutationFn: (data: any) => leavesAPI.createLeave(data),
    onSuccess: () => {
      toast.success("Leave application submitted for approval");
      setShowForm(false);
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["student", "leaves"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit request");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveType || !startDate || !endDate || !reason) {
      toast.error("Please fill all required fields");
      return;
    }
    createLeaveMutation.mutate({
      leaveType,
      startDate,
      endDate,
      reason,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading leave history...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit and track your leave requests
          </p>
          {createLeaveMutation.isPending && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Submitting leave request...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 bg-primary/10 text-primary px-3 py-1 text-[10px] uppercase tracking-[0.12em]"
          >
            {studentLeaves.length} Requests
          </Badge>
          <Button
            onClick={() => setShowForm(!showForm)}
            size="sm"
            className={
              showForm
                ? "h-10 bg-muted text-muted-foreground"
                : "h-10 bg-primary text-primary-foreground hover:bg-primary/90"
            }
          >
            {showForm ? (
              "Cancel"
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> New Request
              </>
            )}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card
                    className="app-card border-primary/20 motion-slide-up"
        >
          <CardHeader className="pb-3 px-6">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-widest">
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                  Leave Type
                </Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger className="h-11 bg-background border-border text-foreground">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="medical">Medical / Health</SelectItem>
                    <SelectItem value="od">
                      On-Duty (Representational)
                    </SelectItem>
                    <SelectItem value="personal">Personal / Casual</SelectItem>
                    <SelectItem value="family">Family / Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                  Start Date
                </Label>
                <Input
                  type="date"
                  className="h-11 bg-background/80 border-border/70 text-foreground"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                  End Date
                </Label>
                <Input
                  type="date"
                  className="h-11 bg-background/80 border-border/70 text-foreground"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                  Supporting Document
                </Label>
                <div className="border border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:bg-muted/50 transition-colors group">
                  <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground uppercase tracking-[0.12em]">
                    Upload PDF/JPEG
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                Reason
              </Label>
              <Textarea
                placeholder="Briefly explain the reason for your leave request..."
                className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground/80"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                className="h-11 px-8 font-semibold tracking-[0.08em]"
                onClick={handleSubmit}
                disabled={createLeaveMutation.isPending}
              >
                {createLeaveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card
                className="app-card overflow-hidden motion-slide-up"
      >
        <CardHeader className="pb-3 px-6">
          <CardTitle className="text-sm font-bold text-foreground/90 flex items-center gap-2 uppercase tracking-widest">
            <FileText className="h-4 w-4 text-primary" /> Request History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="motion-table-stagger">
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] h-11">
                  Class
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] h-11">
                  Duration
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] h-11">
                  Rationale
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] h-11">
                  Approver
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] h-11 text-right pr-6">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentLeaves.map((leave: any, idx: number) => (
                <TableRow
                  key={leave.id}
                  className="border-border hover:bg-muted/30 transition-colors group"
                  style={{ "--row-index": idx } as any}
                >
                  <TableCell className="font-bold text-sm text-foreground uppercase tracking-tight">
                    {leave.leaveType}
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground font-medium">
                    {format(new Date(leave.startDate), "MMM dd")} —{" "}
                    {format(new Date(leave.endDate), "MMM dd")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {leave.reason}
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {leave.approver?.facultyProfile?.fullName || "PENDING"}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <StatusBadge status={leave.status} />
                  </TableCell>
                </TableRow>
              ))}
              {studentLeaves.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground font-bold uppercase tracking-widest text-[10px]"
                  >
                    No leave requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
