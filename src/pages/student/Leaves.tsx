import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    }
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
    }
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
      reason
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase aura-text-glow">Absence Registry</h1>
          <p className="text-[10px] text-muted-foreground font-mono tracking-[0.2em] uppercase mt-1">Institutional Absence Protocols // Secure Filing</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          className={showForm ? "bg-slate-800 text-slate-400" : "glow-cyan"}
        >
          {showForm ? "Cancel Entry" : <><Plus className="mr-2 h-4 w-4" /> New Request</>}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-slate-900/40 border-primary/30 border backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="pb-3 px-6">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-widest">Request Authorization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Classification</label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="medical">Medical / Health</SelectItem>
                    <SelectItem value="od">On-Duty (Representational)</SelectItem>
                    <SelectItem value="personal">Personal / Casual</SelectItem>
                    <SelectItem value="family">Family / Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Commencement Date</label>
                <Input
                  type="date"
                  className="bg-slate-950 border-slate-800 text-slate-200"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Conclusion Date</label>
                <Input
                  type="date"
                  className="bg-slate-950 border-slate-800 text-slate-200"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Evidence Payload</label>
                <div className="border border-dashed border-slate-800 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-800/50 transition-colors group">
                  <Upload className="h-4 w-4 mx-auto mb-1 text-slate-600 group-hover:text-primary transition-colors" />
                  <p className="text-[10px] font-bold text-slate-600 group-hover:text-slate-400">UPLOAD DOCS (PDF/JPEG)</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Logical Rationale</label>
              <Textarea
                placeholder="Explain the necessity for this absence protocol..."
                className="resize-none bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-700"
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
                {createLeaveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "TRANSMIT REQUEST"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm overflow-hidden shadow-xl">
        <CardHeader className="pb-3 px-6">
          <CardTitle className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-widest">
            <FileText className="h-4 w-4 text-primary" /> Historical Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/40">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Class</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Duration</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Rationale</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Approver</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11 text-right pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentLeaves.map((leave: any) => (
                <TableRow key={leave.id} className="border-slate-800 hover:bg-white/5 transition-colors group">
                  <TableCell className="font-bold text-sm text-slate-100 uppercase tracking-tighter">{leave.leaveType}</TableCell>
                  <TableCell className="text-[10px] text-slate-400 font-mono">
                    {format(new Date(leave.startDate), "MMM dd")} — {format(new Date(leave.endDate), "MMM dd")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{leave.reason}</TableCell>
                  <TableCell className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {leave.approver?.facultyProfile?.fullName || "PENDING SYSTEM"}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <StatusBadge status={leave.status} />
                  </TableCell>
                </TableRow>
              ))}
              {studentLeaves.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500 italic font-mono uppercase tracking-widest text-[10px]">No leave protocols detected in neural history</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
