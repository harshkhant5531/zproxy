import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, Loader2, Plus, Edit2, Trash2, X, Save, BookOpen } from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesAPI, usersAPI } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CourseManagement() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    department: "",
    semester: "1",
    credits: "4",
    totalClasses: "40",
    description: "",
    status: "active",
    facultyId: "",
  });

  const { data: facultyData } = useQuery({
    queryKey: ["admin", "faculty"],
    queryFn: async () => {
      const resp = await usersAPI.getFaculty();
      return resp.data.data.faculty || [];
    },
  });

  const facultyMembers = Array.isArray(facultyData) ? facultyData : [];

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      const data = resp.data.data;
      return data.courses || (Array.isArray(data) ? data : []);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => coursesAPI.createCourse(data),
    onSuccess: () => {
      toast.success("Course indexed successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      setIsAddOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Indexing failure"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      coursesAPI.updateCourse(id, data),
    onSuccess: () => {
      toast.success("Registry updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      setIsEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => coursesAPI.deleteCourse(id),
    onSuccess: () => {
      toast.success("Course purged from registry");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });

  const [isSubjectsOpen, setIsSubjectsOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    code: "",
    name: "",
    type: "Theory",
    credits: "4",
    totalClasses: "40",
    description: "",
    facultyId: "",
  });

  const subjectMutation = useMutation({
    mutationFn: (data: any) =>
      coursesAPI.createSubject(selectedCourse.id, data),
    onSuccess: () => {
      toast.success("Subject synchronized");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      setSubjectForm({
        code: "",
        name: "",
        type: "Theory",
        credits: "4",
        totalClasses: "40",
        description: "",
        facultyId: "",
      });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: number) => coursesAPI.deleteSubject(id),
    onSuccess: () => {
      toast.success("Subject purged");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });

  const handleEdit = (course: any) => {
    setSelectedCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      department: course.department,
      semester: course.semester.toString(),
      credits: course.credits.toString(),
      totalClasses: course.totalClasses.toString(),
      description: course.description || "",
      status: course.status,
      facultyId: course.facultyId?.toString() || "",
    });
    setIsEditOpen(true);
  };

  const handleManageSubjects = (course: any) => {
    setSelectedCourse(course);
    setIsSubjectsOpen(true);
  };

  const [search, setSearch] = useState("");

  const courses = Array.isArray(coursesData) ? coursesData : [];

  const filtered = courses.filter(
    (c: any) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center" />;
  }

  return (
    <>
      <FullScreenLoader show={isLoading} operation="loading" />
      <FullScreenLoader show={createMutation.isPending} operation="creating" />
      <FullScreenLoader show={updateMutation.isPending} operation="saving" />
      <FullScreenLoader show={deleteMutation.isPending} operation="deleting" />
      <FullScreenLoader show={subjectMutation.isPending} operation="creating" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase flex items-center gap-3 aura-text-glow">
              <BookOpen className="h-8 w-8 text-primary" />
              Academic Registry Ontology
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-[0.2em] mt-1 uppercase">
              {courses.length} REGISTERED ENTITIES IN CORE SYSTEM
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 font-bold uppercase tracking-widest text-[10px] h-9 px-6">
                <Plus className="mr-2 h-4 w-4" /> Index New Course
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-primary">
                  Initialise New Course Entity
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                  Define core parameters for the academic engine
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Unique Code
                    </Label>
                    <Input
                      placeholder="e.g. CSE-302"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      className="bg-slate-950 border-slate-800 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Credits
                    </Label>
                    <Input
                      type="number"
                      value={formData.credits}
                      onChange={(e) =>
                        setFormData({ ...formData, credits: e.target.value })
                      }
                      className="bg-slate-950 border-slate-800 focus:ring-primary/40"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Course Title
                  </Label>
                  <Input
                    placeholder="e.g. Distributed Systems"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-slate-950 border-slate-800 focus:ring-primary/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Department
                    </Label>
                    <Input
                      placeholder="e.g. CSE"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className="bg-slate-950 border-slate-800 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Semester
                    </Label>
                    <Select
                      value={formData.semester}
                      onValueChange={(v) =>
                        setFormData({ ...formData, semester: v })
                      }
                    >
                      <SelectTrigger className="bg-slate-950 border-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <SelectItem key={s} value={s.toString()}>
                            SEM {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Faculty Head / In-Charge
                  </Label>
                  <Select
                    value={formData.facultyId}
                    onValueChange={(v) =>
                      setFormData({ ...formData, facultyId: v })
                    }
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-800">
                      <SelectValue placeholder="Assign course lead..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-910 border-slate-800 text-white">
                      {facultyMembers.map((f: any) => (
                        <SelectItem key={f.id} value={f.id.toString()}>
                          {f.facultyProfile?.fullName || f.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full mt-4 bg-primary hover:bg-primary/90 font-black uppercase tracking-tight"
                  onClick={() => createMutation.mutate(formData)}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Commit to Registry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Filter courses by code or name..."
            className="pl-9 bg-slate-900/50 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:ring-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-2xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-950/40">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">
                    Unique Code
                  </TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">
                    Course Title
                  </TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">
                    Department
                  </TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">
                    Sem/Credits
                  </TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">
                    Course Head
                  </TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">
                    Enrollment
                  </TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow
                    key={c.id}
                    className="border-slate-800 hover:bg-white/5 transition-colors group"
                  >
                    <TableCell className="font-mono text-sm font-black text-primary group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                      {c.code}
                    </TableCell>
                    <TableCell className="font-bold text-sm text-slate-100">
                      {c.name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-medium uppercase tracking-tighter">
                      {c.department}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-mono text-slate-300">
                          SEM {c.semester}
                        </span>
                        <span className="text-[10px] font-bold text-primary">
                          {c.credits} CR
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.faculty?.facultyProfile?.fullName ||
                        c.faculty?.username ||
                        "Not Assigned"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">
                          {c.students?.length || 0}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          Students
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white hover:bg-white/10"
                          onClick={() => handleEdit(c)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => {
                            if (
                              confirm(
                                `Purge ${c.code} from registry? This will affect all associated subjects and sessions.`,
                              )
                            ) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-slate-500 italic"
                    >
                      No matching courses found in registry
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Course Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-primary">
                Modify Course Parameters
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                Update registry entry for {selectedCourse?.code}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Course Title
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="bg-slate-950 border-slate-800 focus:ring-primary/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Department
                  </Label>
                  <Input
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="bg-slate-950 border-slate-800 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Semester
                  </Label>
                  <Select
                    value={formData.semester}
                    onValueChange={(v) =>
                      setFormData({ ...formData, semester: v })
                    }
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <SelectItem key={s} value={s.toString()}>
                          SEM {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full mt-4 bg-primary hover:bg-primary/90 font-black uppercase tracking-tight"
                onClick={() =>
                  updateMutation.mutate({
                    id: selectedCourse.id,
                    data: formData,
                  })
                }
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Synchronize Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Subject Management Dialog */}
        <Dialog open={isSubjectsOpen} onOpenChange={setIsSubjectsOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-primary">
                Granular Subject Registry
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                Managing components for {selectedCourse?.code}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Add Subject form */}
              <div className="bg-slate-950/50 p-4 border border-slate-800 rounded-lg space-y-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                  Index New Subject Component
                </h3>
                <div className="grid grid-cols-12 gap-3">
                  <Input
                    placeholder="CODE"
                    className="col-span-3 bg-slate-900 border-slate-800 text-xs"
                    value={subjectForm.code}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, code: e.target.value })
                    }
                  />
                  <Input
                    placeholder="SUBJECT NAME"
                    className="col-span-4 bg-slate-900 border-slate-800 text-xs"
                    value={subjectForm.name}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, name: e.target.value })
                    }
                  />
                  <Select
                    value={subjectForm.type}
                    onValueChange={(v) =>
                      setSubjectForm({ ...subjectForm, type: v })
                    }
                  >
                    <SelectTrigger className="col-span-3 bg-slate-900 border-slate-800 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="Theory">Theory</SelectItem>
                      <SelectItem value="Practical">Practical</SelectItem>
                      <SelectItem value="Tutorial">Tutorial</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={subjectForm.facultyId}
                    onValueChange={(v) =>
                      setSubjectForm({ ...subjectForm, facultyId: v })
                    }
                  >
                    <SelectTrigger className="col-span-3 bg-slate-900 border-slate-800 text-xs h-9">
                      <SelectValue placeholder="Select Faculty" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {facultyMembers.map((f: any) => (
                        <SelectItem key={f.id} value={f.id.toString()}>
                          {f.facultyProfile?.fullName || f.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-12 gap-3 mt-3">
                  <Input
                    placeholder="CREDITS"
                    type="number"
                    className="col-span-2 bg-slate-900 border-slate-800 text-xs"
                    value={subjectForm.credits}
                    onChange={(e) =>
                      setSubjectForm({
                        ...subjectForm,
                        credits: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="TOTAL SESSIONS"
                    type="number"
                    className="col-span-3 bg-slate-900 border-slate-800 text-xs"
                    value={subjectForm.totalClasses}
                    onChange={(e) =>
                      setSubjectForm({
                        ...subjectForm,
                        totalClasses: e.target.value,
                      })
                    }
                  />
                  <Input
                    placeholder="DESCRIPTION"
                    className="col-span-5 bg-slate-900 border-slate-800 text-xs"
                    value={subjectForm.description}
                    onChange={(e) =>
                      setSubjectForm({
                        ...subjectForm,
                        description: e.target.value,
                      })
                    }
                  />
                  <Button
                    className="col-span-2 h-9 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                    onClick={() => subjectMutation.mutate(subjectForm)}
                    disabled={subjectMutation.isPending}
                  >
                    {subjectMutation.isPending ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* List of subjects */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                  Active Components
                </h3>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      {selectedCourse?.subjects?.map((s: any) => (
                        <TableRow
                          key={s.id}
                          className="border-slate-800 hover:bg-white/5 bg-slate-900/40"
                        >
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {s.code}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {s.name}
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
                              {s.type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                              {s.faculty?.facultyProfile?.fullName ||
                                s.faculty?.username ||
                                "Not Assigned"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-8 w-8 p-0"
                              onClick={() => {
                                if (confirm("Purge this subject component?"))
                                  deleteSubjectMutation.mutate(s.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!selectedCourse?.subjects ||
                        selectedCourse.subjects.length === 0) && (
                        <TableRow>
                          <TableCell className="text-center py-8 text-slate-500 font-mono text-xs uppercase italic">
                            No active components indexed
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
