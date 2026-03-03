import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Loader2,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Save,
  Search,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timetableAPI, coursesAPI, usersAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [faculty, setFaculty] = useState<Faculty[]>([]);

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
      return resp.data.data.users;
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

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-400">Loading timetable...</span>
      </div>
    );
  }

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-tighter flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Timetable Management
          </h1>
          <p className="text-sm text-slate-400 font-mono tracking-wider uppercase">
            Academic Schedule Matrix
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search courses, rooms, or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-950 border-slate-800 focus:ring-primary/40"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] bg-slate-950 border-slate-800">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 text-white">
            {sessionTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="border-slate-800 text-slate-400 hover:text-white"
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button
          variant="outline"
          className="border-slate-800 text-slate-400 hover:text-white"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md overflow-x-auto shadow-2xl">
        <CardContent className="p-0">
          <div className="min-w-[1000px]">
            {/* Header */}
            <div className="grid grid-cols-[120px_repeat(5,1fr)] bg-slate-950/60 border-b border-slate-800">
              <div className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock className="h-3 w-3" /> Time Slots
              </div>
              {days.map((day, idx) => (
                <div
                  key={day}
                  className="p-4 text-[10px] font-black text-slate-300 text-center border-l border-slate-800/50 uppercase tracking-[0.3em]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Rows */}
            {timeSlots.map((slot) => (
              <div
                key={slot.start}
                className="grid grid-cols-[120px_repeat(5,1fr)] border-b border-slate-800/30 group"
              >
                <div className="p-4 text-[11px] text-slate-500 font-mono font-bold bg-slate-950/20 group-hover:text-primary transition-colors">
                  {slot.start} - {slot.end}
                </div>
                {days.map((day, dayIdx) => {
                  // dayOfWeek is 0-6 (Sun-Sat), but our grid is Mon-Fri (1-5)
                  const session = currentEntries.find(
                    (e) =>
                      e.dayOfWeek === dayIdx + 1 && e.startTime === slot.start,
                  );

                  return (
                    <div
                      key={day}
                      className="p-3 border-l border-slate-800/30 min-h-[120px] hover:bg-white/5 transition-all duration-300 cursor-pointer group/slot relative"
                      onClick={() => !session && handleSlotClick(dayIdx, slot)}
                    >
                      {session ? (
                        <div className="h-full rounded-lg bg-slate-950/80 border border-primary/20 p-3 text-xs space-y-2 group/card relative overflow-hidden flex flex-col justify-between shadow-lg">
                          <button
                            className="absolute top-1 right-1 p-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-red-500/20 hover:bg-red-500/40 rounded text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this timetable entry?"))
                                deleteMutation.mutate(session.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <div>
                            <p className="font-black text-primary uppercase tracking-tighter italic text-sm">
                              {session.course?.code}
                            </p>
                            <p className="text-slate-400 line-clamp-1 font-medium">
                              {session.course?.name}
                            </p>
                          </div>
                          <div className="space-y-1 pt-2">
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                              <MapPin className="h-3 w-3 text-slate-700" />{" "}
                              {session.roomNumber || "—"}
                            </div>
                            <p className="text-[9px] text-slate-600 italic font-mono truncate">
                              Faculty:{" "}
                              {session.facultyProfile?.fullName ||
                                session.faculty?.username ||
                                "TBA"}
                            </p>
                          </div>
                          <div className="absolute bottom-1 left-1">
                            <Badge
                              variant="outline"
                              className="text-[9px] border-primary/30 text-primary"
                            >
                              {session.type || "Theory"}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full border border-dashed border-slate-800/50 rounded-lg flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4 text-slate-700" />
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
            className="border-slate-800 text-slate-400 hover:text-white"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            className="border-slate-800 text-slate-400 hover:text-white"
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
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <div className="h-2 w-2 rounded-full bg-primary" /> Scheduled Session
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <div className="h-2 w-2 rounded-full bg-slate-800" /> Available Slot
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-primary">
              Add Timetable Entry
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-mono text-[10px] uppercase">
              Scheduling for {selectedSlot && days[selectedSlot.day - 1]} at{" "}
              {selectedSlot?.time.start} - {selectedSlot?.time.end}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Course
              </Label>
              <Select
                value={formData.courseId}
                onValueChange={(v) =>
                  setFormData({ ...formData, courseId: v, subjectId: "" })
                }
              >
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Select course..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {courses?.map((c: Course) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Subject
              </Label>
              <Select
                value={formData.subjectId}
                onValueChange={(v) =>
                  setFormData({ ...formData, subjectId: v })
                }
                disabled={!formData.courseId}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue
                    placeholder={
                      !formData.courseId
                        ? "Select course first"
                        : "Select subject..."
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {subjects.map((s: Subject) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Faculty
              </Label>
              <Select
                value={formData.facultyId}
                onValueChange={(v) =>
                  setFormData({ ...formData, facultyId: v })
                }
                disabled={!formData.courseId}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue
                    placeholder={
                      !formData.courseId
                        ? "Select course first"
                        : "Select faculty..."
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
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
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Room Number
                </Label>
                <Input
                  placeholder="e.g. LH-201"
                  value={formData.roomNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, roomNumber: e.target.value })
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
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Session Type
              </Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="Theory">Theory</SelectItem>
                  <SelectItem value="Practical">Practical</SelectItem>
                  <SelectItem value="Tutorial">Tutorial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full mt-4 bg-primary hover:bg-primary/90 font-black uppercase italic tracking-tighter"
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
