import { useQuery } from "@tanstack/react-query";
import { gradesAPI } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Award, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function StudentGrades() {
  const { data: listRes, isLoading: listLoading } = useQuery({
    queryKey: ["grades", "student", "list"],
    queryFn: async () => {
      const res = await gradesAPI.getGrades({ limit: 100, page: 1 });
      return res.data.data;
    },
  });

  const { data: reportRes, isLoading: reportLoading } = useQuery({
    queryKey: ["grades", "student", "report"],
    queryFn: async () => {
      const res = await gradesAPI.getGradeReport();
      return res.data.data;
    },
  });

  const grades = listRes?.grades ?? [];
  const report = reportRes;
  const loading = listLoading || reportLoading;

  if (loading) {
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <Award className="h-7 w-7 text-primary" />
          My grades
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Marks and grade entries recorded for your enrollment
        </p>
      </div>

      {report && report.totalMarks > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overall performance</CardTitle>
            <CardDescription>
              Across {report.totalSubjects} recorded assessment
              {report.totalSubjects === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Weighted average</span>
              <span className="font-semibold text-foreground">
                {report.averagePercentage}%
              </span>
            </div>
            <Progress value={report.averagePercentage} className="h-2" />
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Grade book</CardTitle>
          <CardDescription>Most recent entries first</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {grades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No grades published yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Subject</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                  <TableHead className="text-right">Term</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map(
                  (g: {
                    id: number;
                    subject: { name: string };
                    course: { code: string };
                    assignment: string | null;
                    marksObtained: number;
                    totalMarks: number;
                    grade: string;
                    semester: number;
                    year: number;
                    teacherRemarks: string | null;
                  }) => (
                    <TableRow key={g.id} className="border-border">
                      <TableCell className="font-medium">{g.subject.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {g.course.code}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {g.assignment || "—"}
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
