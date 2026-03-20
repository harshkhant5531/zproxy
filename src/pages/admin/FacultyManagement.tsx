import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersAPI, coursesAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { toast } from "sonner";
import {
  UserPlus,
  BookOpen,
  Trash2,
  Mail,
  Shield,
  Loader2,
  Edit2,
  Save,
} from "lucide-react";

export default function FacultyManagement() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    employeeId: "",
    department: "",
    designation: "",
    qualification: "",
    phone: "",
    address: "",
    bio: "",
  });

  const { data: facultyData, isLoading: isFacultyLoading } = useQuery({
    queryKey: ["admin", "faculty"],
    queryFn: async () => {
      const resp = await usersAPI.getFaculty();
      return resp.data.data.faculty;
    },
  });

  const { data: coursesData } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      return resp.data.data.courses;
    },
  });

  const faculty = facultyData;
  const courses = coursesData;

  const createFacultyMutation = useMutation({
    mutationFn: (data: any) => usersAPI.createFaculty(data),
    onSuccess: () => {
      toast.success("Faculty member created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "faculty"] });
      setIsAddDialogOpen(false);
      setFormData({
        username: "",
        password: "",
        fullName: "",
        email: "",
        employeeId: "",
        department: "",
        designation: "",
        qualification: "",
        phone: "",
        address: "",
        bio: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create faculty");
    },
  });

  const updateFacultyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      usersAPI.updateStudentProfile(id, data),
    onSuccess: () => {
      toast.success("Faculty profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "faculty"] });
      setIsEditOpen(false);
      setSelectedFaculty(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to update faculty"),
  });

  const deleteFacultyMutation = useMutation({
    mutationFn: (id: number) => usersAPI.deleteUser(id),
    onSuccess: () => {
      toast.success("Faculty member removed from system");
      queryClient.invalidateQueries({ queryKey: ["admin", "faculty"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to delete faculty"),
  });

  const assignSubjectMutation = useMutation({
    mutationFn: ({
      facultyId,
      courseId,
    }: {
      facultyId: number;
      courseId: number;
    }) => coursesAPI.updateCourse(courseId, { facultyId }),
    onSuccess: () => {
      toast.success("Subject assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "faculty"] });
      setIsAssignOpen(false);
    },
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);

  const handleEdit = (member: any) => {
    setSelectedFaculty(member);
    setFormData({
      username: member.username,
      password: "",
      fullName: member.facultyProfile?.fullName || "",
      email: member.email,
      employeeId: member.facultyProfile?.employeeId || "",
      department: member.facultyProfile?.department || "",
      designation: member.facultyProfile?.designation || "",
      qualification: member.facultyProfile?.qualification || "",
      phone: member.facultyProfile?.phone || "",
      address: member.facultyProfile?.address || "",
      bio: member.facultyProfile?.bio || "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (
      confirm(
        "Are you sure you want to remove this faculty member? This action cannot be undone.",
      )
    ) {
      deleteFacultyMutation.mutate(id);
    }
  };

  if (isFacultyLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading faculty...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Faculty Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage faculty profiles and subject assignments
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="mr-2 h-4 w-4" /> Add Faculty
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-popover border-border text-popover-foreground">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                  Add New Faculty Member
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Create a faculty account and profile information.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                      Username
                    </label>
                    <Input
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                      Password
                    </label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                    Full Name
                  </label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                      Employee ID
                    </label>
                    <Input
                      value={formData.employeeId}
                      onChange={(e) =>
                        setFormData({ ...formData, employeeId: e.target.value })
                      }
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                      Department
                    </label>
                    <Input
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                      Designation
                    </label>
                    <Input
                      value={formData.designation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          designation: e.target.value,
                        })
                      }
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                      Qualification
                    </label>
                    <Input
                      value={formData.qualification}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          qualification: e.target.value,
                        })
                      }
                      className="bg-background border-border"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="border-t border-border/60 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => createFacultyMutation.mutate(formData)}
                  disabled={createFacultyMutation.isPending}
                >
                  {createFacultyMutation.isPending ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  ) : null}
                  Create Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          <Card className="app-card overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.12em]">
                Active Faculty Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/60">
                    <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em]">
                      Faculty Info
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em]">
                      Department & Role
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em]">
                      Assigned Subjects
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faculty?.map((member: any) => (
                    <TableRow
                      key={member.id}
                      className="border-border/60 hover:bg-muted/25 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">
                              {member.facultyProfile?.fullName ||
                                member.username}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {member.facultyProfile?.employeeId ||
                                "EMPID-MISSING"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground font-medium">
                          {member.facultyProfile?.department || "N/A"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {member.facultyProfile?.designation || "Faculty"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.facultyCourses?.map((course: any) => (
                            <span
                              key={course.id}
                              className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20"
                            >
                              {course.code}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setSelectedFaculty(member);
                              setIsAssignOpen(true);
                            }}
                          >
                            <BookOpen className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={() => handleEdit(member)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive/90 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl bg-popover border-border text-popover-foreground">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                Edit Faculty Profile
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Update selected faculty details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                  Full Name
                </label>
                <Input
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="bg-background border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                    Employee ID
                  </label>
                  <Input
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                    Department
                  </label>
                  <Input
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                    Designation
                  </label>
                  <Input
                    value={formData.designation}
                    onChange={(e) =>
                      setFormData({ ...formData, designation: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground/70 uppercase">
                    Qualification
                  </label>
                  <Input
                    value={formData.qualification}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        qualification: e.target.value,
                      })
                    }
                    className="bg-background border-border"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="border-t border-border/60 pt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() =>
                  updateFacultyMutation.mutate({
                    id: selectedFaculty?.id,
                    data: formData,
                  })
                }
                disabled={updateFacultyMutation.isPending}
              >
                {updateFacultyMutation.isPending ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Subject Dialog */}
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogContent className="max-w-xl bg-popover border-border text-popover-foreground">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                Assign Subject to {selectedFaculty?.username}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Select one course to assign this faculty member.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Select
                onValueChange={(val) =>
                  assignSubjectMutation.mutate({
                    facultyId: selectedFaculty?.id,
                    courseId: parseInt(val),
                  })
                }
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select a subject..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {courses
                    ?.filter((c: any) => c.facultyId !== selectedFaculty?.id)
                    .map((course: any) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.code} — {course.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {assignSubjectMutation.isPending && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="animate-spin h-4 w-4 text-primary" />
                </div>
              )}
            </div>
            <DialogFooter className="border-t border-border/60 pt-4">
              <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
