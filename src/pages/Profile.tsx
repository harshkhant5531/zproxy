/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  IdCard,
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  Sparkles,
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

  const roleMeta = useMemo(() => {
    if (!user) {
      return { label: "User", accent: "text-primary", subtitle: "" };
    }

    switch (user.role) {
      case "admin":
        return {
          label: "Admin Control",
          accent: "text-warning dark:text-warning",
          subtitle: "Platform governance, policy, and operational control",
        };
      case "faculty":
        return {
          label: "Faculty Identity",
          accent: "text-primary",
          subtitle: "Teaching profile, department context, and access data",
        };
      default:
        return {
          label: "Student Identity",
          accent: "text-emerald-600 dark:text-emerald-400",
          subtitle: "Academic record, profile details, and security controls",
        };
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
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success(
        forcedPasswordChange
          ? "Default password replaced. Your account is now secure."
          : "Password updated successfully.",
      );
    } catch (error: any) {
      const detail =
        error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.message ||
        "Failed to update password.";
      toast.error(detail);
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="app-page space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm motion-page-enter">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-3xl font-bold text-primary shadow-inner">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.profile?.fullName || user.username}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                getInitials(user.profile?.fullName || user.username)
              )}
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-md bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary shadow-none border border-primary/20 hover:bg-primary/15">
                  <Sparkles className="mr-1.5 h-3 w-3" /> {roleMeta.label}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-md border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"
                >
                  <BadgeCheck className="mr-1.5 h-3 w-3" />{" "}
                  {user.status || "active"}
                </Badge>
                {user.requiresPasswordChange && (
                  <Badge
                    variant="outline"
                    className="rounded-md border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"
                  >
                    <AlertTriangle className="mr-1.5 h-3 w-3" /> Action Required
                  </Badge>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {user.profile?.fullName || user.username}
                </h1>
                <p className={`mt-1 text-sm font-medium ${roleMeta.accent}`}>
                  {roleMeta.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> {user.email}
                </span>
                {user.profile?.department && (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />{" "}
                    {user.profile.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem] motion-stagger">
            <Card
              variant="glass"
              className="app-card bg-muted/20 shadow-none motion-surface"
            >
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Username
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {user.username}
                </p>
              </CardContent>
            </Card>
            <Card
              variant="glass"
              className="app-card bg-muted/20 shadow-none motion-surface"
            >
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Identifier
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {user.profile?.enrollmentNumber ||
                    user.profile?.employeeId ||
                    `ID-${user.id}`}
                </p>
              </CardContent>
            </Card>
            <Card
              variant="glass"
              className="app-card bg-muted/20 shadow-none motion-surface"
            >
              <CardContent className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Security
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {user.requiresPasswordChange ? "Action Needed" : "Secure"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {forcedPasswordChange && (
        <section className="rounded-[1.75rem] border border-warning/30 bg-[linear-gradient(135deg,rgba(254,243,199,0.9),rgba(255,251,235,0.9))] p-5 shadow-[0_20px_70px_-45px_rgba(245,158,11,0.8)] dark:bg-warning/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/15 text-warning dark:text-warning">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-warning dark:text-warning/90">
                  Password change required
                </p>
                <p className="mt-1 text-sm text-warning/90 dark:text-warning/80">
                  This account is still using the seeded default password.
                  Replace it now before using the rest of the system.
                </p>
              </div>
            </div>
            <Badge className="rounded-full bg-warning px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-none hover:bg-warning">
              student123 detected
            </Badge>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card
          className="app-card overflow-hidden motion-slide-up"
          style={{ animationDelay: "150ms" }}
        >
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="flex items-center gap-3 text-lg font-bold tracking-tight">
              <UserCircle2 className="h-5 w-5 text-primary" /> Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Full Name
                  </Label>
                  <Input
                    value={profileForm.fullName}
                    onChange={(event) =>
                      handleProfileField("fullName", event.target.value)
                    }
                    className="h-11 rounded-xl border-border/70 bg-background/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Username
                  </Label>
                  <Input
                    value={profileForm.username}
                    onChange={(event) =>
                      handleProfileField("username", event.target.value)
                    }
                    className="h-11 rounded-xl border-border/70 bg-background/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) =>
                      handleProfileField("email", event.target.value)
                    }
                    className="h-11 rounded-xl border-border/70 bg-background/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Phone
                  </Label>
                  <Input
                    value={profileForm.phone}
                    onChange={(event) =>
                      handleProfileField("phone", event.target.value)
                    }
                    className="h-11 rounded-xl border-border/70 bg-background/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Department
                  </Label>
                  <Input
                    value={profileForm.department}
                    onChange={(event) =>
                      handleProfileField("department", event.target.value)
                    }
                    className="h-11 rounded-xl border-border/70 bg-background/80"
                  />
                </div>
                {user.role === "faculty" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Designation
                    </Label>
                    <Input
                      value={profileForm.designation}
                      onChange={(event) =>
                        handleProfileField("designation", event.target.value)
                      }
                      className="h-11 rounded-xl border-border/70 bg-background/80"
                    />
                  </div>
                )}
                {user.role === "faculty" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Qualification
                    </Label>
                    <Input
                      value={profileForm.qualification}
                      onChange={(event) =>
                        handleProfileField("qualification", event.target.value)
                      }
                      className="h-11 rounded-xl border-border/70 bg-background/80"
                    />
                  </div>
                )}
                {user.role === "faculty" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Office Hours
                    </Label>
                    <Input
                      value={profileForm.officeHours}
                      onChange={(event) =>
                        handleProfileField("officeHours", event.target.value)
                      }
                      className="h-11 rounded-xl border-border/70 bg-background/80"
                    />
                  </div>
                )}
                {user.role === "student" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Parent Phone
                    </Label>
                    <Input
                      value={profileForm.parentPhone}
                      onChange={(event) =>
                        handleProfileField("parentPhone", event.target.value)
                      }
                      className="h-11 rounded-xl border-border/70 bg-background/80"
                    />
                  </div>
                )}
                {user.role === "student" && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Parent Email
                    </Label>
                    <Input
                      type="email"
                      value={profileForm.parentEmail}
                      onChange={(event) =>
                        handleProfileField("parentEmail", event.target.value)
                      }
                      className="h-12 rounded-2xl border-border/70 bg-background/80"
                    />
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Address
                  </Label>
                  <Input
                    value={profileForm.address}
                    onChange={(event) =>
                      handleProfileField("address", event.target.value)
                    }
                    className="h-11 rounded-xl border-border/70 bg-background/80"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Bio
                  </Label>
                  <Textarea
                    value={profileForm.bio}
                    onChange={(event) =>
                      handleProfileField("bio", event.target.value)
                    }
                    className="min-h-[120px] rounded-xl border-border bg-muted/10 px-4 py-3 focus:bg-background transition-colors"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isSavingProfile}
                className="h-11 rounded-lg px-6 text-sm font-bold shadow-sm motion-press"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card
            className="app-card overflow-hidden motion-slide-up"
            style={{ animationDelay: "200ms" }}
          >
            <CardHeader className="border-b border-border bg-muted/30">
              <CardTitle className="flex items-center gap-3 text-lg font-bold tracking-tight">
                <KeyRound className="h-5 w-5 text-amber-500" /> Security
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-5">
                <div className="rounded-[1.5rem] border border-primary/15 bg-primary/8 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                    Security Policy
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {forcedPasswordChange
                      ? "Your account is blocked from normal navigation until the default password is replaced."
                      : "Update your password regularly and avoid reusing institutional credentials elsewhere."}
                  </p>
                </div>

                {!isGoogleUser && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Current Password
                    </Label>
                    <Input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        handlePasswordField(
                          "currentPassword",
                          event.target.value,
                        )
                      }
                      className="h-12 rounded-2xl border-border/70 bg-background/80"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    New Password
                  </Label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      handlePasswordField("newPassword", event.target.value)
                    }
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Confirm New Password
                  </Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      handlePasswordField("confirmPassword", event.target.value)
                    }
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSavingPassword}
                  className="h-11 w-full rounded-xl text-sm font-semibold uppercase tracking-[0.08em] shadow-lg shadow-success/20"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {isSavingPassword ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card
            className="app-card motion-slide-up"
            style={{ animationDelay: "250ms" }}
          >
            <CardHeader className="pb-3 px-6 pt-6">
              <CardTitle className="flex items-center gap-3 text-lg font-bold tracking-tight">
                <IdCard className="h-5 w-5 text-primary" /> Identity Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm px-6 pb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-2.5">
                  <span className="text-muted-foreground font-medium">
                    Role
                  </span>
                  <span className="font-bold capitalize text-primary">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-2.5">
                  <span className="text-muted-foreground font-medium">
                    Department
                  </span>
                  <span className="font-bold text-foreground">
                    {user.profile?.department || "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-2.5">
                  <span className="text-muted-foreground font-medium">
                    Phone
                  </span>
                  <span className="font-bold text-foreground">
                    {user.profile?.phone || "Not set"}
                  </span>
                </div>
              </div>
              <Separator className="bg-border" />
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 motion-surface">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Account Guidance
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Keep contact and department details up to date for leave
                  approvals, timetable mapping, and institutional notifications.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
