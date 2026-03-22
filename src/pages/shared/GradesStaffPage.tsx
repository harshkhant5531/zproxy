import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gradesAPI, coursesAPI, usersAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Award, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

type CourseRow = {
  id: number;
  code: string;
  name: string;
  facultyId: number | null;
  subjects: { id: number; name: string; code: string | null }[];
};

export default function GradesStaffPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [assignment, setAssignment] = useState("");
  const [marksObtained, setMarksObtained] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [gradeLetter, setGradeLetter] = useState("");
  const [semester, setSemester] = useState("1");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [remarks, setRemarks] = useState("");

  const { data: coursesData } = useQuery({
    queryKey: ["courses", "grades-picker"],
    queryFn: async () => {
      const res = await coursesAPI.getCourses({ limit: 200, page: 1 });
      return res.data.data.courses as CourseRow[];
    },
  });

  const { data: studentsData } = useQuery({
    queryKey: ["users", "students"],
    queryFn: async () => {
      const res = await usersAPI.getStudents();
      return res.data.data.students as {
        id: number;
        username: string;
        studentProfile: { fullName: string; enrollmentNumber: string } | null;
      }[];
    },
    enabled: user?.role === "admin" || user?.role === "faculty",
  });

  const { data: gradesData, isLoading } = useQuery({
    queryKey: ["grades", "staff", user?.role],
    queryFn: async () => {
      const res = await gradesAPI.getGrades({ limit: 100, page: 1 });
      return res.data.data;
    },
    enabled: !!user,
  });

  const courses = useMemo(() => {
    const list = coursesData ?? [];
    if (user?.role === "faculty") {
      return list.filter((c) => c.facultyId === user.id);
    }
    return list;
  }, [coursesData, user]);

  const selectedCourse = courses.find((c) => String(c.id) === courseId);
  const subjects = selectedCourse?.subjects ?? [];

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => gradesAPI.createGrade(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Grade saved");
      setOpen(false);
      setStudentId("");
      setCourseId("");
      setSubjectId("");
      setAssignment("");
      setMarksObtained("");
      setTotalMarks("");
      setGradeLetter("");
      setRemarks("");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || "Could not save grade");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sid = parseInt(studentId, 10);
    const cid = parseInt(courseId, 10);
    const subId = parseInt(subjectId, 10);
    const mo = parseInt(marksObtained, 10);
    const tm = parseInt(totalMarks, 10);
    const sem = parseInt(semester, 10);
    const yr = parseInt(year, 10);
    if (!sid || !cid || !subId || Number.isNaN(mo) || Number.isNaN(tm)) {
      toast.error("Fill student, course, subject, and marks");
      return;
    }
    if (!gradeLetter.trim()) {
      toast.error("Grade letter is required");
      return;
    }
    createMutation.mutate({
      studentId: sid,
      courseId: cid,
      subjectId: subId,
      assignment: assignment.trim() || undefined,
      marksObtained: mo,
      totalMarks: tm,
      grade: gradeLetter.trim(),
      semester: sem,
      year: yr,
      teacherRemarks: remarks.trim() || undefined,
    });
  };

  const grades = gradesData?.grades ?? [];

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading grades…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-7 w-7 text-primary" />
            Grades
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {user?.role === "faculty"
              ? "Entries for your courses"
              : "All grade records (admin)"}
          </p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="self-start sm:self-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add grade
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto border-border bg-background">
            <SheetHeader>
              <SheetTitle>New grade</SheetTitle>
              <SheetDescription>
                Student must be enrolled in the course and subject.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 px-1">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {(studentsData ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.studentProfile?.fullName ?? s.username} (#{s.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Course</Label>
                <Select
                  value={courseId}
                  onValueChange={(v) => {
                    setCourseId(v);
                    setSubjectId("");
                  }}
                >
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={subjectId}
                  onValueChange={setSubjectId}
                  disabled={!courseId}
                >
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assignment (optional)</Label>
                <Input
                  value={assignment}
                  onChange={(e) => setAssignment(e.target.value)}
                  className="border-border"
                  placeholder="Quiz 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Marks obtained</Label>
                  <Input
                    type="number"
                    min={0}
                    value={marksObtained}
                    onChange={(e) => setMarksObtained(e.target.value)}
                    className="border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total marks</Label>
                  <Input
                    type="number"
                    min={1}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input
                  value={gradeLetter}
                  onChange={(e) => setGradeLetter(e.target.value)}
                  className="border-border"
                  placeholder="A, B+, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Input
                    type="number"
                    min={1}
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    min={2000}
                    max={2100}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Remarks (optional)</Label>
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="border-border"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save grade"
                )}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Recent entries</CardTitle>
          <CardDescription>Latest 100 in your scope</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {grades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No grades yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                  <TableHead className="text-right">Term</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map(
                  (g: {
                    id: number;
                    student: {
                      studentProfile: { fullName: string } | null;
                      username: string;
                    };
                    subject: { name: string };
                    course: { code: string };
                    marksObtained: number;
                    totalMarks: number;
                    grade: string;
                    semester: number;
                    year: number;
                  }) => (
                    <TableRow key={g.id} className="border-border">
                      <TableCell className="font-medium">
                        {g.student.studentProfile?.fullName ?? g.student.username}
                      </TableCell>
                      <TableCell>{g.subject.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {g.course.code}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {g.marksObtained}/{g.totalMarks}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {g.grade}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        Sem {g.semester} · {g.year}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
