/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, BookOpen, MapPin } from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { subjectsAPI, sessionsAPI } from "@/lib/api";
import {
  getGeolocationPermissionState,
  getLocationErrorMessage,
  requestStabilizedPositionWithRetry,
} from "@/lib/location";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MIN_RADIUS_METERS = 10;
const MAX_RADIUS_METERS = 200;
const DEFAULT_RADIUS_METERS = 60;

export default function CreateSession() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [room, setRoom] = useState("");
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [radius, setRadius] = useState(String(DEFAULT_RADIUS_METERS));
  const [locating, setLocating] = useState(false);

  const { data: subjectsData, isLoading: isSubjectsLoading } = useQuery({
    queryKey: ["faculty", "my-subjects", user?.id],
    queryFn: async () => {
      const resp = await subjectsAPI.getSubjects({ facultyId: user?.id });
      return resp.data.data.subjects || resp.data.data;
    },
    enabled: !!user?.id,
  });

  const facultySubjects = Array.isArray(subjectsData) ? subjectsData : [];
  const selectedSubject = facultySubjects.find(
    (s: any) => s.id.toString() === subjectId,
  );
  const radiusValue = Math.min(
    MAX_RADIUS_METERS,
    Math.max(
      MIN_RADIUS_METERS,
      Number.parseInt(radius, 10) || DEFAULT_RADIUS_METERS,
    ),
  );
  const radiusZone =
    radiusValue <= 24
      ? "office"
      : radiusValue <= 60
        ? "class"
        : radiusValue <= 120
          ? "auditorium"
          : "max";

  const createSessionMutation = useMutation({
    mutationFn: (data: any) => sessionsAPI.createSession(data),
    onSuccess: (resp) => {
      const newSession = resp.data.data.session;
      toast.success("Session initialized. Redirecting to live feed...");
      navigate(`/faculty/session/${newSession.id}`);
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Failed to initialize session",
      );
    },
  });

  const handleGenerate = () => {
    if (!subjectId || !topic || selectedBatches.length === 0) {
      toast.error("Subject, topic, and at least one batch are required.");
      return;
    }

    const normalizedRadius = Math.min(
      MAX_RADIUS_METERS,
      Math.max(
        MIN_RADIUS_METERS,
        Number.parseInt(radius, 10) || DEFAULT_RADIUS_METERS,
      ),
    );
    if (String(normalizedRadius) !== radius) {
      setRadius(String(normalizedRadius));
    }

    const now = new Date();
    const startTime = now.toTimeString().split(" ")[0].substring(0, 5);
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const endTime = end.toTimeString().split(" ")[0].substring(0, 5);

    setLocating(true);

    getGeolocationPermissionState()
      .then((permissionState) => {
        if (permissionState === "denied") {
          throw new Error(
            "Location permission is blocked. Enable it in the browser and try again.",
          );
        }

        return requestStabilizedPositionWithRetry({
          timeout: 30000,
          desiredAccuracyMeters: 60,
          maxRetries: 4,
          sampleCount: 8,
          intervalMs: 800,
        });
      })
      .then((location) => {
        const facultyAccuracy = location.accuracy;
        if (Number.isFinite(facultyAccuracy) && facultyAccuracy > 80) {
          setLocating(false);
          toast.error(
            `GPS accuracy is too low (±${Math.round(facultyAccuracy)}m). Move to an open area and try again.`,
          );
          return;
        }

        setLocating(false);
        createSessionMutation.mutate({
          courseId: selectedSubject.courseId,
          subjectId: parseInt(subjectId),
          topic,
          room,
          batches: selectedBatches,
          date: now.toISOString(),
          startTime,
          endTime,
          geofenceRadius: normalizedRadius,
          facultyLat: location.latitude,
          facultyLng: location.longitude,
        });
      })
      .catch((error) => {
        setLocating(false);
        toast.error(getLocationErrorMessage(error));
      });
  };

  return (
    <>
      <FullScreenLoader show={isSubjectsLoading} operation="loading" />
      <FullScreenLoader
        show={createSessionMutation.isPending || locating}
        operation={locating ? "locating" : "creating"}
      />
      <div className="app-page max-w-2xl mx-auto">
        <div className="app-page-header text-center sm:text-left">
          <div>
            <h1 className="page-header-title">Create Session</h1>
            <p className="page-header-sub">Set up a live attendance session</p>
          </div>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center justify-center gap-4 py-4">
          {["Subject", "Logic", "Deploy"].map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black border transition-all duration-500 ${i + 1 <= step ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(34,211,238,0.3)]" : "bg-muted border-border text-muted-foreground"}`}
              >
                {i + 1}
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${i + 1 <= step ? "text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              {i < 2 && (
                <div
                  className={`h-[1px] w-8 ${i + 1 < step ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <Card
          className="bg-card border border-border shadow-sm relative overflow-hidden motion-fade-scale"
          style={{ animationDelay: "100ms" }}
        >
          <CardContent className="p-8 space-y-8 relative">
            {step >= 1 && (
              <div className="space-y-3 motion-slide-up">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">
                  Subject Module
                </label>
                <Select
                  value={subjectId}
                  onValueChange={(v) => {
                    setSubjectId(v);
                    setStep(Math.max(step, 2));
                  }}
                >
                  <SelectTrigger className="h-12 bg-background border-border text-foreground focus:ring-primary/50">
                    <SelectValue placeholder="Identify target subject..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {facultySubjects.map((s: any) => (
                      <SelectItem
                        key={s.id}
                        value={s.id.toString()}
                        className="focus:bg-accent focus:text-accent-foreground"
                      >
                        {s.name}{" "}
                        <span className="text-muted-foreground ml-1 text-[10px] italic">
                          ({s.course?.code || "Core"})
                        </span>
                      </SelectItem>
                    ))}
                    {facultySubjects.length === 0 && (
                      <p className="p-2 text-xs text-muted-foreground italic">
                        No assigned subjects detected
                      </p>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {step >= 2 && subjectId && (
              <div
                className="space-y-5 motion-slide-up"
                style={{ animationDelay: "40ms" }}
              >
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">
                    Target Batches
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {[
                      "A1",
                      "A2",
                      "A3",
                      "A4",
                      "A5",
                      "A6",
                      "B1",
                      "B2",
                      "B3",
                      "B4",
                      "B5",
                      "B6",
                      "B7",
                      "B8",
                      "B9",
                      "C1",
                      "C2",
                      "C3",
                      "C4",
                      "C5",
                      "C6",
                      "C7",
                      "C8",
                      "C9",
                      "C10",
                      "C11",
                    ].map((batch) => (
                      <div
                        key={batch}
                        onClick={() => {
                          const newBatches = selectedBatches.includes(batch)
                            ? selectedBatches.filter((b) => b !== batch)
                            : [...selectedBatches, batch];
                          setSelectedBatches(newBatches);
                          if (newBatches.length > 0 && topic) setStep(3);
                        }}
                        className={`cursor-pointer h-10 flex items-center justify-center rounded-lg border font-black text-xs transition-colors duration-300 ${
                          selectedBatches.includes(batch)
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-muted/30 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {batch}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">
                    Session Topic
                  </label>
                  <Input
                    className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
                    placeholder="e.g. AVL Trees, SQL Joins, Deadlocks..."
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      if (e.target.value.trim() && selectedBatches.length > 0)
                        setStep(3);
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">
                      Geofence Radius (meters)
                    </label>
                    <span className="text-xs font-black text-primary font-mono tracking-tighter bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      {radius}m
                    </span>
                  </div>
                  <div className="px-2 pt-2">
                    <input
                      type="range"
                      min="10"
                      max="200"
                      step="5"
                      value={radius}
                      onChange={(e) => {
                        const nextRadius = Math.min(
                          MAX_RADIUS_METERS,
                          Math.max(
                            MIN_RADIUS_METERS,
                            Number.parseInt(e.target.value, 10) ||
                              DEFAULT_RADIUS_METERS,
                          ),
                        );
                        setRadius(String(nextRadius));
                      }}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-2">
                      <span
                        className={`text-[8px] font-bold uppercase tracking-widest text-left ${
                          radiusZone === "office"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        Office (10m)
                      </span>
                      <span
                        className={`text-[8px] font-bold uppercase tracking-widest text-center ${
                          radiusZone === "class"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        Class (25m)
                      </span>
                      <span
                        className={`text-[8px] font-bold uppercase tracking-widest text-center ${
                          radiusZone === "auditorium"
                            ? "text-success"
                            : "text-muted-foreground"
                        }`}
                      >
                        Auditorium (100m)
                      </span>
                      <span
                        className={`text-[8px] font-bold uppercase tracking-widest text-right ${
                          radiusZone === "max"
                            ? "text-warning"
                            : "text-muted-foreground"
                        }`}
                      >
                        Max (200m)
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground italic ml-1">
                    Defines the valid spatial grid centered at your current
                    location. Students must be within this {radius}m radius to
                    authenticate.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && topic && (
              <div className="space-y-4 motion-fade-scale text-center pt-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-left space-y-1 mb-4">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] text-center mb-3">
                    Ready for Deployment
                  </p>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">
                        Target Batches
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedBatches.map((b) => (
                          <span
                            key={b}
                            className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-black"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="h-px bg-border/50" />
                    <div className="space-y-2">
                      <p className="text-foreground font-mono text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground text-xs uppercase italic min-w-[70px]">
                          Subject:{" "}
                        </span>
                        <span className="font-bold">
                          {selectedSubject?.name}
                        </span>
                      </p>
                      <p className="text-foreground font-mono text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground text-xs uppercase italic min-w-[70px]">
                          Topic:{" "}
                        </span>
                        <span className="font-bold">{topic}</span>
                      </p>
                      <p className="text-foreground font-mono text-sm flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground text-xs uppercase italic min-w-[70px]">
                          Radius:{" "}
                        </span>
                        <span className="font-bold">{radius} Meters</span>
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full h-14 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-shadow motion-press"
                  onClick={handleGenerate}
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <BookOpen className="mr-3 h-5 w-5" /> Execute
                      Initialization
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-[9px] text-muted-foreground/60 font-mono uppercase tracking-[0.5em]">
            Academic Integrity Engine // Secure Authentication
          </p>
        </div>
      </div>
    </>
  );
}
