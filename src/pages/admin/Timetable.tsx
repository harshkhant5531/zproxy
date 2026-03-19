/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { timetableAPI, coursesAPI, usersAPI } from "@/lib/api";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Loader2,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Save,
  Search,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Define types for data structures
interface Course {
  id: number;
  code: string;
  name: string;
  subjects: Subject[];
  facultyId: number;
}

interface Subject {
  id: number;
  name: string;
}

interface Faculty {
  id: number;
  username: string;
  facultyProfile: {
    fullName: string;
  };
}

interface TimetableEntry {
  id: number;
  courseId: number;
  subjectId: number;
  facultyId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string;
  type: string;
  semester: number;
  course?: Course;
  subject?: Subject;
  faculty?: Faculty;
  facultyProfile?: {
    fullName: string;
  };
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = [
  { start: "07:45", end: "09:35" },
  { start: "09:50", end: "11:30" },
  { start: "12:10", end: "13:50" },
];

const sessionTypes = ["All", "Theory", "Practical", "Tutorial"];

export default function Timetable() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    day: number;
    time: { start: string; end: string };
  } | null>(null);
  const [formData, setFormData] = useState({
    courseId: "",
    subjectId: "",
    facultyId: "",
    roomNumber: "",
    type: "Theory",
    semester: "1",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { data: timetableData, isLoading } = useQuery<TimetableEntry[]>({
    queryKey: ["admin", "timetable"],
    queryFn: async () => {
      const resp = await timetableAPI.getTimetable({ limit: 100 });
      return resp.data.data.timetableEntries;
    },
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      return resp.data.data.courses;
    },
  });

  const { data: facultyData } = useQuery<Faculty[]>({
    queryKey: ["admin", "faculty"],
    queryFn: async () => {
      const resp = await usersAPI.getFaculty();
      return resp.data.data.faculty;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => timetableAPI.createTimetableEntry(data),
    onSuccess: () => {
      toast.success("Timetable entry created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "timetable"] });
      setIsAddOpen(false);
    },
    onError: (err: any) =>
      toast.error(
        err.response?.data?.message || "Failed to create timetable entry",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) =>
      timetableAPI.deleteTimetableEntry(id.toString()),
    onSuccess: () => {
      toast.success("Timetable entry deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "timetable"] });
    },
  });

  // Get subjects for selected course
  useEffect(() => {
    if (formData.courseId) {
      const selectedCourse = courses?.find(
        (course: Course) => course.id === parseInt(formData.courseId),
      );
      if (selectedCourse) {
        setSubjects(selectedCourse.subjects || []);
      }
    }
  }, [formData.courseId, courses]);

  // Get faculty for selected course
  useEffect(() => {
    if (formData.courseId) {
      const selectedCourse = courses?.find(
        (course: Course) => course.id === parseInt(formData.courseId),
      );
      if (selectedCourse && selectedCourse.facultyId) {
        setFormData((prev) => ({
          ...prev,
          facultyId: selectedCourse.facultyId.toString(),
        }));
      }
    }
  }, [formData.courseId, courses]);

  const handleSlotClick = (
    dayIdx: number,
    time: { start: string; end: string },
  ) => {
    setSelectedSlot({ day: dayIdx + 1, time });
    setIsAddOpen(true);
  };

  let entries = Array.isArray(timetableData) ? timetableData : [];

  // Apply search filter
  if (searchQuery) {
    entries = entries.filter(
      (entry) =>
        entry.course?.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.course?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.facultyProfile?.fullName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );
  }

  // Apply type filter
  if (filterType !== "All") {
    entries = entries.filter((entry) => entry.type === filterType);
  }

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEntries = entries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(entries.length / itemsPerPage);

  const handleExport = () => {
    toast.success("Timetable exported successfully");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <FullScreenLoader show={isLoading} operation="loading" />
      <FullScreenLoader show={createMutation.isPending} operation="creating" />
      <FullScreenLoader show={deleteMutation.isPending} operation="deleting" />
      <div className="app-page">
        <div className="app-page-header">
          <div>
            <h1 className="page-header-title flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Timetable Management
            </h1>
            <p className="page-header-sub">Create and manage class schedules</p>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 bg-primary/10 text-primary px-3 py-1 text-[10px] uppercase tracking-[0.12em]"
          >
            {entries.length} Total Entries
          </Badge>
        </div>

        <Card className="app-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search courses, rooms, or faculty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/80 border-border/70 focus:ring-primary/40"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px] bg-background/80 border-border/70">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {sessionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="border-border/70 text-muted-foreground hover:text-foreground"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                className="border-border/70 text-muted-foreground hover:text-foreground"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="app-card overflow-x-auto">
          <CardHeader className="card-header-muted py-4 px-6">
            <CardTitle className="text-sm font-semibold text-foreground">
              Weekly Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[130px_repeat(5,1fr)] bg-muted/35 dark:bg-muted/20 border-b border-border/70">
                <div className="p-4 text-xs font-semibold text-foreground/80 uppercase tracking-[0.12em] flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Time Slots
                </div>
                {days.map((day) => (
                  <div
                    key={day}
                    className="p-4 text-sm font-semibold text-foreground text-center border-l border-border/50 uppercase tracking-[0.08em]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {timeSlots.map((slot) => (
                <div
                  key={slot.start}
                  className="grid grid-cols-[130px_repeat(5,1fr)] border-b border-border/45 group"
                >
                  <div className="p-4 text-sm text-foreground/85 font-mono font-semibold bg-muted/20 group-hover:text-primary transition-colors">
                    {slot.start} - {slot.end}
                  </div>
                  {days.map((day, dayIdx) => {
                    const session = currentEntries.find(
                      (e) =>
                        e.dayOfWeek === dayIdx + 1 &&
                        e.startTime === slot.start,
                    );

                    return (
                      <div
                        key={day}
                        className="p-3 border-l border-border/45 min-h-[132px] hover:bg-accent/35 transition-all duration-300 cursor-pointer group/slot relative"
                        onClick={() =>
                          !session && handleSlotClick(dayIdx, slot)
                        }
                      >
                        {session ? (
                          <div className="h-full rounded-xl bg-card/95 dark:bg-card/85 border border-border/65 p-3.5 text-sm space-y-2 group/card relative overflow-hidden flex flex-col justify-between shadow-lg transition-all hover:border-primary/30">
                            <button
                              className="absolute top-1 right-1 p-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20 rounded-md text-destructive border border-destructive/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this timetable entry?"))
                                  deleteMutation.mutate(session.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            <div>
                              <p className="text-foreground font-semibold text-sm leading-snug tracking-tight">
                                {session.subject?.name || session.course?.name}
                              </p>
                            </div>
                            <div className="space-y-1.5 pt-2">
                              <div className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium tracking-wide">
                                <MapPin className="h-3.5 w-3.5 text-primary/60" />{" "}
                                {session.roomNumber || "UNASSIGNED"}
                              </div>
                              <p className="text-xs text-foreground/70 font-mono truncate">
                                {session.facultyProfile?.fullName ||
                                  session.faculty?.username ||
                                  "Unassigned"}
                              </p>
                            </div>
                            <div className="absolute bottom-1 right-1">
                              <Badge
                                variant="outline"
                                className="text-[10px] border-primary/20 text-primary bg-primary/5 py-0 px-1.5 font-semibold"
                              >
                                {session.type || "Theory"}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full border border-dashed border-border/45 rounded-xl flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity">
                            <Plus className="h-5 w-5 text-primary/40" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              className="border-border/70 text-muted-foreground hover:text-foreground"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              className="border-border/70 text-muted-foreground hover:text-foreground"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex justify-center gap-8 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 uppercase tracking-wide">
            <div className="h-2 w-2 rounded-full bg-primary" /> Scheduled
            Session
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/70 uppercase tracking-wide">
            <div className="h-2 w-2 rounded-full bg-muted" /> Available Slot
          </div>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-2xl bg-popover border-border text-popover-foreground">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                Create Timetable Entry
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Assigning for {selectedSlot && days[selectedSlot.day - 1]} •{" "}
                {selectedSlot?.time.start} - {selectedSlot?.time.end}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-3">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Course
                </Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, courseId: v, subjectId: "" })
                  }
                >
                  <SelectTrigger className="bg-background/80 border-border/70">
                    <SelectValue placeholder="Select course..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {courses?.map((c: Course) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Subject
                </Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, subjectId: v })
                  }
                  disabled={!formData.courseId}
                >
                  <SelectTrigger className="bg-background/80 border-border/70">
                    <SelectValue
                      placeholder={
                        !formData.courseId
                          ? "Select course first"
                          : "Select subject..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {subjects.map((s: Subject) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Faculty
                </Label>
                <Select
                  value={formData.facultyId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, facultyId: v })
                  }
                  disabled={!formData.courseId}
                >
                  <SelectTrigger className="bg-background/80 border-border/70">
                    <SelectValue
                      placeholder={
                        !formData.courseId
                          ? "Select course first"
                          : "Select faculty..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {facultyData?.map((f: Faculty) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.facultyProfile?.fullName || f.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Room Number
                  </Label>
                  <Input
                    placeholder="e.g. LH-201"
                    value={formData.roomNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, roomNumber: e.target.value })
                    }
                    className="bg-background/80 border-border/70 focus:ring-primary/40"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Semester
                  </Label>
                  <Select
                    value={formData.semester}
                    onValueChange={(v) =>
                      setFormData({ ...formData, semester: v })
                    }
                  >
                    <SelectTrigger className="bg-background/80 border-border/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                        <SelectItem key={semester} value={semester.toString()}>
                          Semester {semester}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Session Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger className="bg-background/80 border-border/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="Theory">Theory</SelectItem>
                    <SelectItem value="Practical">Practical</SelectItem>
                    <SelectItem value="Tutorial">Tutorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="border-t border-border/60 pt-4">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() =>
                  createMutation.mutate({
                    ...formData,
                    dayOfWeek: selectedSlot?.day,
                    startTime: selectedSlot?.time.start,
                    endTime: selectedSlot?.time.end,
                    semester: parseInt(formData.semester),
                    courseId: parseInt(formData.courseId),
                    subjectId: parseInt(formData.subjectId),
                    facultyId: parseInt(formData.facultyId),
                  })
                }
                disabled={
                  createMutation.isPending ||
                  !formData.courseId ||
                  !formData.subjectId ||
                  !formData.facultyId
                }
              >
                {createMutation.isPending ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Create Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
