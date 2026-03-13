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
  Phone,
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
          accent: "text-amber-600 dark:text-amber-400",
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
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(240,249,255,0.88))] p-6 shadow-[0_24px_80px_-40px_rgba(14,165,233,0.45)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(8,47,73,0.7))]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.1),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-primary/20 bg-white/70 text-2xl font-black text-primary shadow-lg shadow-primary/10 dark:bg-background/40">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.profile?.fullName || user.username}
                  className="h-full w-full rounded-[1.65rem] object-cover"
                />
              ) : (
                getInitials(user.profile?.fullName || user.username)
              )}
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary shadow-none hover:bg-primary/10">
                  <Sparkles className="mr-1.5 h-3 w-3" /> {roleMeta.label}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400"
                >
                  <BadgeCheck className="mr-1.5 h-3 w-3" />{" "}
                  {user.status || "active"}
                </Badge>
                {user.requiresPasswordChange && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400"
                  >
                    <AlertTriangle className="mr-1.5 h-3 w-3" /> Action Required
                  </Badge>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-foreground">
                  {user.profile?.fullName || user.username}
                </h1>
                <p className={`mt-1 text-sm font-semibold ${roleMeta.accent}`}>
                  {roleMeta.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-3 py-1.5 dark:bg-background/40">
                  <Mail className="h-3.5 w-3.5 text-primary" /> {user.email}
                </span>
                {user.profile?.department && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-3 py-1.5 dark:bg-background/40">
                    <Building2 className="h-3.5 w-3.5 text-primary" />{" "}
                    {user.profile.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
            <Card className="border-white/60 bg-white/75 shadow-lg shadow-sky-100 dark:border-white/10 dark:bg-background/40">
              <CardContent className="p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Username
                </p>
                <p className="mt-2 text-sm font-bold text-foreground">
                  {user.username}
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/60 bg-white/75 shadow-lg shadow-sky-100 dark:border-white/10 dark:bg-background/40">
              <CardContent className="p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Identifier
                </p>
                <p className="mt-2 text-sm font-bold text-foreground">
                  {user.profile?.enrollmentNumber ||
                    user.profile?.employeeId ||
                    `ID-${user.id}`}
                </p>
              </CardContent>
            </Card>
            <Card className="border-white/60 bg-white/75 shadow-lg shadow-sky-100 dark:border-white/10 dark:bg-background/40">
              <CardContent className="p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Security
                </p>
                <p className="mt-2 text-sm font-bold text-foreground">
                  {user.requiresPasswordChange
                    ? "Default password in use"
                    : "Password healthy"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {forcedPasswordChange && (
        <section className="rounded-[1.75rem] border border-amber-500/30 bg-[linear-gradient(135deg,rgba(254,243,199,0.9),rgba(255,251,235,0.9))] p-5 shadow-[0_20px_70px_-45px_rgba(245,158,11,0.8)] dark:bg-amber-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                  Password change required
                </p>
                <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                  This account is still using the seeded default password.
                  Replace it now before using the rest of the system.
                </p>
              </div>
            </div>
            <Badge className="rounded-full bg-amber-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-none hover:bg-amber-600">
              student123 detected
            </Badge>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="overflow-hidden border-border/60 bg-card/90 shadow-xl shadow-sky-100/40 dark:shadow-none">
          <CardHeader className="border-b border-border/50 bg-[linear-gradient(180deg,rgba(14,165,233,0.06),transparent)]">
            <CardTitle className="flex items-center gap-3 text-xl font-black tracking-[-0.03em]">
              <UserCircle2 className="h-5 w-5 text-primary" /> Profile Center
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
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
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
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
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
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
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
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
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
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
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
                      className="h-12 rounded-2xl border-border/70 bg-background/80"
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
                      className="h-12 rounded-2xl border-border/70 bg-background/80"
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
                      className="h-12 rounded-2xl border-border/70 bg-background/80"
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
                      className="h-12 rounded-2xl border-border/70 bg-background/80"
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
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Bio
                  </Label>
                  <Textarea
                    value={profileForm.bio}
                    onChange={(event) =>
                      handleProfileField("bio", event.target.value)
                    }
                    className="min-h-[130px] rounded-[1.5rem] border-border/70 bg-background/80 px-4 py-3"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isSavingProfile}
                className="h-12 rounded-2xl px-6 text-sm font-black uppercase tracking-[0.16em] shadow-lg shadow-primary/20"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden border-border/60 bg-card/90 shadow-xl shadow-sky-100/40 dark:shadow-none">
            <CardHeader className="border-b border-border/50 bg-[linear-gradient(180deg,rgba(34,197,94,0.06),transparent)]">
              <CardTitle className="flex items-center gap-3 text-xl font-black tracking-[-0.03em]">
                <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />{" "}
                Password & Security
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
                        handlePasswordField("currentPassword", event.target.value)
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
                  className="h-12 w-full rounded-2xl text-sm font-black uppercase tracking-[0.16em] shadow-lg shadow-emerald-500/20"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {isSavingPassword ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/90 shadow-xl shadow-sky-100/40 dark:shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg font-black tracking-[-0.03em]">
                <IdCard className="h-5 w-5 text-primary" /> Identity Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-semibold capitalize text-foreground">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-semibold text-foreground">
                    {user.profile?.department || "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-semibold text-foreground">
                    {user.profile?.phone || "Not set"}
                  </span>
                </div>
              </div>
              <Separator className="bg-border/60" />
              <div className="rounded-[1.5rem] border border-sky-500/20 bg-sky-500/8 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
                  Light Theme Note
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-muted-foreground">
                  This profile UI is tuned for the light palette first: cleaner
                  contrast, softer cards, and stronger information grouping
                  without flattening the hierarchy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
