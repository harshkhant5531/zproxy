/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  IdCard,
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";

type ProfileFormState = {
  username: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  bio: string;
  department: string;
  designation: string;
  qualification: string;
  officeHours: string;
  parentPhone: string;
  parentEmail: string;
};

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const DEFAULT_PASSWORD_BY_ROLE: Record<string, string> = {
  admin: "admin123",
  faculty: "faculty123",
  student: "student123",
};

const getDefaultPasswordForRole = (role?: string) =>
  role ? DEFAULT_PASSWORD_BY_ROLE[role] || "" : "";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const forcedPasswordChange =
    Boolean(location.state?.forcedPasswordChange) ||
    Boolean(user?.requiresPasswordChange);
  const isGoogleUser = Boolean(
    user?.avatar && user.avatar.includes("googleusercontent.com"),
  );

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    username: "",
    email: "",
    fullName: "",
    phone: "",
    address: "",
    bio: "",
    department: "",
    designation: "",
    qualification: "",
    officeHours: "",
    parentPhone: "",
    parentEmail: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: forcedPasswordChange
      ? getDefaultPasswordForRole(user?.role)
      : "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      username: user.username || "",
      email: user.email || "",
      fullName: user.profile?.fullName || "",
      phone: user.profile?.phone || "",
      address: user.profile?.address || "",
      bio: user.profile?.bio || "",
      department: user.profile?.department || "",
      designation: user.profile?.designation || "",
      qualification: user.profile?.qualification || "",
      officeHours: user.profile?.officeHours || "",
      parentPhone: user.profile?.parentPhone || "",
      parentEmail: user.profile?.parentEmail || "",
    });
    setPasswordForm((prev) => ({
      ...prev,
      currentPassword: user.requiresPasswordChange
        ? getDefaultPasswordForRole(user.role)
        : prev.currentPassword,
    }));
  }, [user]);

  const roleLabel = useMemo(() => {
    switch (user?.role) {
      case "admin": return "Administrator";
      case "faculty": return "Faculty";
      default: return "Student";
    }
  }, [user]);

  if (!user) return null;

  const handleProfileField = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordField = (
    field: "currentPassword" | "newPassword" | "confirmPassword",
    value: string,
  ) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);
    try {
      await authAPI.updateProfile(profileForm);
      await refreshUser();
      toast.success("Profile updated successfully.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    setIsSavingPassword(true);
    try {
      await authAPI.updatePassword(
        isGoogleUser ? "__google_skip__" : passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      await refreshUser();
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success(
        forcedPasswordChange
          ? "Default password replaced successfully."
          : "Password updated successfully.",
      );
    } catch (error: any) {
      toast.error(
        error.response?.data?.errors?.[0]?.msg ||
          error.response?.data?.message ||
          "Failed to update password.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-muted text-xl font-semibold">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.profile?.fullName || user.username}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(user.profile?.fullName || user.username)
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold">
                  {user.profile?.fullName || user.username}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{roleLabel}</Badge>
                  <Badge variant="outline">{user.status || "active"}</Badge>
                  {user.requiresPasswordChange && (
                    <Badge variant="destructive">Password Required</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
              {user.profile?.department && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {user.profile.department}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forced Password Change Alert */}
      {forcedPasswordChange && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            Your account uses the default password. Please change it below before
            accessing other features.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        {/* Profile Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle2 className="h-4 w-4 text-primary" />
              Profile Details
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profileForm.fullName}
                    onChange={(e) => handleProfileField("fullName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={profileForm.username}
                    onChange={(e) => handleProfileField("username", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => handleProfileField("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) => handleProfileField("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={profileForm.department}
                    onChange={(e) => handleProfileField("department", e.target.value)}
                  />
                </div>
                {user.role === "faculty" && (
                  <>
                    <div className="space-y-2">
                      <Label>Designation</Label>
                      <Input
                        value={profileForm.designation}
                        onChange={(e) => handleProfileField("designation", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qualification</Label>
                      <Input
                        value={profileForm.qualification}
                        onChange={(e) => handleProfileField("qualification", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Office Hours</Label>
                      <Input
                        value={profileForm.officeHours}
                        onChange={(e) => handleProfileField("officeHours", e.target.value)}
                        placeholder="e.g. Mon-Fri, 10am–12pm"
                      />
                    </div>
                  </>
                )}
                {user.role === "student" && (
                  <>
                    <div className="space-y-2">
                      <Label>Parent Phone</Label>
                      <Input
                        value={profileForm.parentPhone}
                        onChange={(e) => handleProfileField("parentPhone", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Parent Email</Label>
                      <Input
                        type="email"
                        value={profileForm.parentEmail}
                        onChange={(e) => handleProfileField("parentEmail", e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={profileForm.address}
                    onChange={(e) => handleProfileField("address", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={profileForm.bio}
                    onChange={(e) => handleProfileField("bio", e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isSavingProfile}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-primary" />
                Security Settings
              </CardTitle>
              <CardDescription>Change your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {!isGoogleUser && (
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => handlePasswordField("currentPassword", e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordField("newPassword", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordField("confirmPassword", e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isSavingPassword} className="w-full">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {isSavingPassword ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Identity Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IdCard className="h-4 w-4 text-primary" />
                Identity Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Role", value: user.role },
                { label: "Department", value: user.profile?.department || "Not set" },
                { label: "Phone", value: user.profile?.phone || "Not set" },
                {
                  label: "ID",
                  value:
                    user.profile?.enrollmentNumber ||
                    user.profile?.employeeId ||
                    `ID-${user.id}`,
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
              <Separator />
              <p className="text-xs text-muted-foreground">
                Keep your details up to date for notifications and leave approvals.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
