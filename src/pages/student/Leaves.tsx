import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { FullScreenLoader } from "@/components/FullScreenLoader";

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

  return (
    <>
      <FullScreenLoader show={isLoading} operation="loading" />
      <FullScreenLoader
        show={createLeaveMutation.isPending}
        operation="submitting"
      />
      <div className="app-page">
        <div className="app-page-header">
          <div>
            <h1 className="page-header-title">Leave Requests</h1>
            <p className="page-header-sub">
              Submit and track your leave requests
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            size="sm"
            className={
              showForm
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }
          >
            {showForm ? (
              "Cancel Entry"
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> New Request
              </>
            )}
          </Button>
        </div>

        {showForm && (
          <Card className="bg-card/80 border-primary/30 border backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            <CardHeader className="pb-3 px-6">
              <CardTitle className="text-sm font-bold text-primary uppercase tracking-widest">
                Request Authorization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Classification
                  </label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger className="bg-background/80 border-border/70 text-foreground">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="medical">Medical / Health</SelectItem>
                      <SelectItem value="od">
                        On-Duty (Representational)
                      </SelectItem>
                      <SelectItem value="personal">
                        Personal / Casual
                      </SelectItem>
                      <SelectItem value="family">Family / Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Commencement Date
                  </label>
                  <Input
                    type="date"
                    className="bg-background/80 border-border/70 text-foreground"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Conclusion Date
                  </label>
                  <Input
                    type="date"
                    className="bg-background/80 border-border/70 text-foreground"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Evidence Payload
                  </label>
                  <div className="border border-dashed border-border/70 rounded-lg p-3 text-center cursor-pointer hover:bg-muted/50 transition-colors group">
                    <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground">
                      UPLOAD DOCS (PDF/JPEG)
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                  Logical Rationale
                </label>
                <Textarea
                  placeholder="Briefly explain the reason for your leave request..."
                  className="resize-none bg-background/80 border-border/70 text-foreground placeholder:text-muted-foreground/80"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  className="px-8 font-bold tracking-tight"
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

        <Card className="bg-card/75 border-border/60 backdrop-blur-sm overflow-hidden shadow-xl">
          <CardHeader className="pb-3 px-6">
            <CardTitle className="text-sm font-bold text-foreground/90 flex items-center gap-2 uppercase tracking-widest">
              <FileText className="h-4 w-4 text-primary" /> Historical Ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/35 dark:bg-muted/20">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider h-11">
                    Class
                  </TableHead>
                  <TableHead className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider h-11">
                    Duration
                  </TableHead>
                  <TableHead className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider h-11">
                    Rationale
                  </TableHead>
                  <TableHead className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider h-11">
                    Approver
                  </TableHead>
                  <TableHead className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider h-11 text-right pr-6">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentLeaves.map((leave: any) => (
                  <TableRow
                    key={leave.id}
                    className="border-border/55 hover:bg-accent/45 transition-colors group"
                  >
                    <TableCell className="font-bold text-sm text-foreground uppercase tracking-tighter">
                      {leave.leaveType}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground font-mono">
                      {format(new Date(leave.startDate), "MMM dd")} —{" "}
                      {format(new Date(leave.endDate), "MMM dd")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {leave.reason}
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      {leave.approver?.facultyProfile?.fullName ||
                        "PENDING SYSTEM"}
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
                      className="h-32 text-center text-muted-foreground italic font-mono uppercase tracking-widest text-[10px]"
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
    </>
  );
}
