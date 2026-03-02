import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Upload, Download, Loader2, Plus, Edit2, Trash2, UserPlus, Shield, X, Save, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersAPI, coursesAPI } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function StudentManagement() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    enrollmentNumber: "",
    rollNumber: "",
    department: "",
    batch: "",
    currentSemester: "1",
    phone: "",
    address: ""
  });

  const { data: userData, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "students", debouncedSearch],
    queryFn: async () => {
      const resp = await usersAPI.getUsers({
        role: "student",
        search: debouncedSearch || undefined,
        limit: 1000
      });
      return resp.data.data.users || [];
    },
    placeholderData: (previousData) => previousData,
  });

  const { data: allCourses } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses({ limit: 1000 });
      return resp.data.data.courses || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => usersAPI.createStudent(data),
    onSuccess: () => {
      toast.success("Student created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create student")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => usersAPI.updateStudentProfile(id, data),
    onSuccess: () => {
      toast.success("Student updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
      setIsEditOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersAPI.deleteUser(id),
    onSuccess: () => {
      toast.success("Student deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
    }
  });

  const enrollmentMutation = useMutation({
    mutationFn: ({ id, courseIds, subjectIds }: { id: number, courseIds: number[], subjectIds: number[] }) =>
      usersAPI.updateStudentEnrollment(id, courseIds, subjectIds),
    onSuccess: () => {
      toast.success("Enrollment updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
      setIsEnrollOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update enrollment")
  });

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      fullName: "",
      enrollmentNumber: "",
      rollNumber: "",
      department: "",
      batch: "",
      currentSemester: "1",
      phone: "",
      address: ""
    });
  };

  const handleEdit = (student: any) => {
    setSelectedStudent(student);
    setFormData({
      username: student.username,
      email: student.email,
      password: "", // Don't show password
      fullName: student.studentProfile?.fullName || "",
      enrollmentNumber: student.studentProfile?.enrollmentNumber || "",
      rollNumber: student.studentProfile?.rollNumber || "",
      department: student.studentProfile?.department || "",
      batch: student.studentProfile?.batch || "",
      currentSemester: student.studentProfile?.currentSemester?.toString() || "1",
      phone: student.studentProfile?.phone || "",
      address: student.studentProfile?.address || ""
    });
    setIsEditOpen(true);
  };

  const handleEnrollment = (student: any) => {
    setSelectedStudent(student);
    const currentCourseIds = student.studentCourses?.map((c: any) => c.id) || [];
    setSelectedCourses(currentCourseIds);
    setIsEnrollOpen(true);
  };

  const toggleCourse = (courseId: number) => {
    setSelectedCourses(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const saveEnrollment = () => {
    if (!selectedStudent) return;

    // For simplicity, we also auto-select all subjects belonging to these courses
    const enrollmentSubjects: number[] = [];
    selectedCourses.forEach(cId => {
      const course = allCourses?.find((c: any) => c.id === cId);
      if (course?.subjects) {
        course.subjects.forEach((s: any) => enrollmentSubjects.push(s.id));
      }
    });

    enrollmentMutation.mutate({
      id: selectedStudent.id,
      courseIds: selectedCourses,
      subjectIds: Array.from(new Set(enrollmentSubjects))
    });
  };

  const students = Array.isArray(userData) ? userData : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Student Registry
          </h1>
          <p className="text-xs text-slate-500 font-mono tracking-widest mt-1">
            {isLoading ? "INITIALIZING SECURE LINK..." : `${students.length} VERIFIED IDENTITIES IN CORE ENGINE`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800">
            <Download className="mr-2 h-4 w-4" /> Export DB
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setIsCreateOpen(true); }} className="bg-primary hover:bg-primary/90 font-bold">
            <UserPlus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>

      <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md group">
              {isFetching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
              )}
              <Input
                placeholder="Search by name, enrollment, or department..."
                className="pl-10 bg-slate-950/50 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:ring-primary/40 h-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/60">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] h-12 px-6">Identity</TableHead>
                <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] h-12">Registry Data</TableHead>
                <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] h-12">Cohort</TableHead>
                <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] h-12">Hardware</TableHead>
                <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] h-12 text-right px-6">Engine Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={isFetching && !isLoading ? "opacity-50 transition-opacity" : ""}>
              {students.map((s: any) => (
                <TableRow key={s.id} className="border-slate-800/50 hover:bg-white/[0.02] transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-100 text-sm">{s.studentProfile?.fullName || s.username}</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{s.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-primary uppercase tracking-tighter">ID: {s.studentProfile?.enrollmentNumber || "PENDING"}</span>
                      <span className="text-[10px] text-slate-400 font-mono">ROLL: {s.studentProfile?.rollNumber || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-300 font-bold uppercase">{s.studentProfile?.department || "N/A"}</span>
                      <span className="text-[10px] text-slate-500 font-medium">SEM {s.studentProfile?.currentSemester || "?"} • {s.studentProfile?.batch || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${s.deviceId ? "bg-emerald-500" : "bg-slate-700"}`} />
                      <span className="text-[10px] font-mono text-slate-500 uppercase truncate max-w-[80px]">
                        {s.deviceId ? "LINKED" : "UNBOUND"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEnrollment(s)} title="Manage Enrollment" className="h-8 w-8 text-amber-500 hover:bg-amber-500/10">
                        <BookOpen className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} className="h-8 w-8 text-primary hover:bg-primary/10">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete student?')) deleteMutation.mutate(s.id); }} className="h-8 w-8 text-red-500 hover:bg-red-500/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
                      <Search className="h-8 w-8 opacity-20" />
                      <p className="text-sm font-medium italic">No matches found in the registry core</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Querying Cloud Registry...</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Initialize New Student Profile
            </DialogTitle>
            <DialogDescription className="text-slate-400">Enter comprehensive institutional data for registry enrollment.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] px-1">
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Username</Label>
                  <Input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="bg-slate-950 border-slate-800" placeholder="jdoe2023" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Primary Email</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="bg-slate-950 border-slate-800" placeholder="student@nit.edu" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-[10px] uppercase font-bold">Account Password</Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="bg-slate-950 border-slate-800" placeholder="••••••••" />
              </div>
              <div className="h-px bg-white/5" />
              <div className="space-y-2">
                <Label className="text-slate-400 text-[10px] uppercase font-bold">Full Legal Name</Label>
                <Input value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="bg-slate-950 border-slate-800" placeholder="Johnathan Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Enrollment Number</Label>
                  <Input value={formData.enrollmentNumber} onChange={e => setFormData({ ...formData, enrollmentNumber: e.target.value })} className="bg-slate-950 border-slate-800" placeholder="NIT22CS045" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Roll Number</Label>
                  <Input value={formData.rollNumber} onChange={e => setFormData({ ...formData, rollNumber: e.target.value })} className="bg-slate-950 border-slate-800" placeholder="220101" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Department</Label>
                  <Input value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="bg-slate-950 border-slate-800" placeholder="CSE" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Batch</Label>
                  <Input value={formData.batch} onChange={e => setFormData({ ...formData, batch: e.target.value })} className="bg-slate-950 border-slate-800" placeholder="2022-26" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Semester</Label>
                  <Input type="number" value={formData.currentSemester} onChange={e => setFormData({ ...formData, currentSemester: e.target.value })} className="bg-slate-950 border-slate-800" />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t border-white/5 pt-6">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-slate-500">Cancel</Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending} className="bg-primary font-bold">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Initialize"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" /> Modify Registry Identity
            </DialogTitle>
            <DialogDescription className="text-slate-400">Updating profile for {selectedStudent?.username}. Credentials cannot be changed here.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] px-1">
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-slate-400 text-[10px] uppercase font-bold">Full Legal Name</Label>
                <Input value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="bg-slate-950 border-slate-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Enrollment ID</Label>
                  <Input value={formData.enrollmentNumber} onChange={e => setFormData({ ...formData, enrollmentNumber: e.target.value })} className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Roll Sequence</Label>
                  <Input value={formData.rollNumber} onChange={e => setFormData({ ...formData, rollNumber: e.target.value })} className="bg-slate-950 border-slate-800" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Core Department</Label>
                  <Input value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Semester Level</Label>
                  <Input type="number" value={formData.currentSemester} onChange={e => setFormData({ ...formData, currentSemester: e.target.value })} className="bg-slate-950 border-slate-800" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Contact Node</Label>
                  <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="bg-slate-950 border-slate-800" placeholder="+91 ..." />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] uppercase font-bold">Physical Address</Label>
                  <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="bg-slate-950 border-slate-800" />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t border-white/5 pt-6">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-slate-500">Abort</Button>
            <Button onClick={() => updateMutation.mutate({ id: selectedStudent.id, data: formData })} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 font-bold">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Commit Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ENROLLMENT DIALOG */}
      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-500">
              <BookOpen className="h-5 w-5" /> Manage Student Enrollment
            </DialogTitle>
            <DialogDescription className="text-slate-400">Select courses to enroll {selectedStudent?.studentProfile?.fullName || selectedStudent?.username}.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-1 gap-2">
                {allCourses?.map((course: any) => (
                  <div
                    key={course.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${selectedCourses.includes(course.id)
                      ? "bg-primary/10 border-primary/50"
                      : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                      }`}
                    onClick={() => toggleCourse(course.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={() => toggleCourse(course.id)}
                        className="border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div>
                        <p className="font-bold text-sm text-slate-100">{course.code} — {course.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-mono">{course.department} • SEMESTER {course.semester} • {course.credits} CREDITS</p>
                      </div>
                    </div>
                    {selectedCourses.includes(course.id) && (
                      <Badge className="bg-primary/20 text-primary border-primary/20 hover:bg-primary/30">ENROLLED</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="border-t border-white/5 pt-6">
            <Button variant="ghost" onClick={() => setIsEnrollOpen(false)} className="text-slate-500">Cancel</Button>
            <Button onClick={saveEnrollment} disabled={enrollmentMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              {enrollmentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sync Enrollment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
