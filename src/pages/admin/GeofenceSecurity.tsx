import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { settingsAPI } from "@/lib/api";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";

type GeofenceSecuritySettings = {
  maxAcceptableAccuracyMeters: number;
  maxLocationAgeMs: number;
  baseToleranceMeters: number;
  maxToleranceMeters: number;
  toleranceAccuracyFactor: number;
  retryBandMinMeters: number;
  retryBandMaxMeters: number;
  retryBandAccuracyFactor: number;
  smallRadiusThresholdMeters: number;
  smallRadiusMaxAccuracyMeters: number;
  sampleSpreadFactor: number;
  sampleSpreadMinMeters: number;
  sampleSpreadMaxMeters: number;
  strictProxyMode: boolean;
  blockMockLocation: boolean;
  requireDeviceFingerprint: boolean;
  blockDuplicateLocationReplay: boolean;
  duplicateLocationReplayWindowSeconds: number;
};

type GeofenceHistoryEntry = {
  id: number;
  createdAt: string;
  changedKeys: string[];
  previousValues: Record<string, unknown>;
  updatedValues: Record<string, unknown>;
  ipAddress: string | null;
  changedBy: {
    id?: number;
    username?: string;
    role?: string;
    displayName?: string;
  };
};

function asNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function GeofenceSecurity() {
  const [form, setForm] = useState<GeofenceSecuritySettings | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "geofence-security-settings"],
    queryFn: async () => {
      const resp = await settingsAPI.getGeofenceSecurity();
      return resp.data.data.settings as GeofenceSecuritySettings;
    },
  });

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["admin", "geofence-security-history"],
    queryFn: async () => {
      const resp = await settingsAPI.getGeofenceSecurityHistory({ limit: 100 });
      return (resp.data.data.history || []) as GeofenceHistoryEntry[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: GeofenceSecuritySettings) =>
      settingsAPI.updateGeofenceSecurity(payload),
    onSuccess: () => {
      toast.success("Geofence security settings updated");
      refetch();
      refetchHistory();
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object" &&
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to save settings";
      toast.error(message);
    },
  });

  const effective = useMemo(() => form || data || null, [form, data]);

  const setNumeric = (key: keyof GeofenceSecuritySettings, value: string) => {
    if (!effective) return;
    const current = effective[key] as unknown as number;
    setForm({
      ...effective,
      [key]: asNumber(value, current),
    });
  };

  const setBoolean = (key: keyof GeofenceSecuritySettings, value: boolean) => {
    if (!effective) return;
    setForm({
      ...effective,
      [key]: value,
    });
  };

  const handleReset = () => {
    if (!data) return;
    setForm(data);
  };

  const handleSave = () => {
    if (!effective) return;
    saveMutation.mutate(effective);
  };

  if (isLoading || !effective) {
    return <FullScreenLoader show operation="loading" />;
  }

  return (
    <div className="app-page space-y-6">
      <div className="app-page-header">
        <div>
          <h1 className="page-header-title">Geofence Security Settings</h1>
          <p className="page-header-sub">
            Tune location precision and anti-proxy guardrails without code
            edits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            Save Settings
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>GPS Precision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Max acceptable GPS accuracy (m)</Label>
              <Input
                type="number"
                value={effective.maxAcceptableAccuracyMeters}
                onChange={(e) =>
                  setNumeric("maxAcceptableAccuracyMeters", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max location age (ms)</Label>
              <Input
                type="number"
                value={effective.maxLocationAgeMs}
                onChange={(e) => setNumeric("maxLocationAgeMs", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Small-radius threshold (m)</Label>
              <Input
                type="number"
                value={effective.smallRadiusThresholdMeters}
                onChange={(e) =>
                  setNumeric("smallRadiusThresholdMeters", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Small-radius max GPS accuracy (m)</Label>
              <Input
                type="number"
                value={effective.smallRadiusMaxAccuracyMeters}
                onChange={(e) =>
                  setNumeric("smallRadiusMaxAccuracyMeters", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>Geofence Acceptance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Base tolerance (m)</Label>
              <Input
                type="number"
                value={effective.baseToleranceMeters}
                onChange={(e) =>
                  setNumeric("baseToleranceMeters", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max tolerance (m)</Label>
              <Input
                type="number"
                value={effective.maxToleranceMeters}
                onChange={(e) =>
                  setNumeric("maxToleranceMeters", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tolerance accuracy factor</Label>
              <Input
                type="number"
                step="0.01"
                value={effective.toleranceAccuracyFactor}
                onChange={(e) =>
                  setNumeric("toleranceAccuracyFactor", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Retry band min/max (m)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={effective.retryBandMinMeters}
                  onChange={(e) =>
                    setNumeric("retryBandMinMeters", e.target.value)
                  }
                />
                <Input
                  type="number"
                  value={effective.retryBandMaxMeters}
                  onChange={(e) =>
                    setNumeric("retryBandMaxMeters", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Retry band accuracy factor</Label>
              <Input
                type="number"
                step="0.01"
                value={effective.retryBandAccuracyFactor}
                onChange={(e) =>
                  setNumeric("retryBandAccuracyFactor", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Sample spread min/max (m)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={effective.sampleSpreadMinMeters}
                  onChange={(e) =>
                    setNumeric("sampleSpreadMinMeters", e.target.value)
                  }
                />
                <Input
                  type="number"
                  value={effective.sampleSpreadMaxMeters}
                  onChange={(e) =>
                    setNumeric("sampleSpreadMaxMeters", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sample spread factor</Label>
              <Input
                type="number"
                step="0.01"
                value={effective.sampleSpreadFactor}
                onChange={(e) =>
                  setNumeric("sampleSpreadFactor", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 lg:col-span-2">
          <CardHeader>
            <CardTitle>Anti-Proxy Controls</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <Label htmlFor="strictProxyMode">Strict proxy mode</Label>
              <Switch
                id="strictProxyMode"
                checked={effective.strictProxyMode}
                onCheckedChange={(v) => setBoolean("strictProxyMode", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <Label htmlFor="blockMockLocation">Block mocked location</Label>
              <Switch
                id="blockMockLocation"
                checked={effective.blockMockLocation}
                onCheckedChange={(v) => setBoolean("blockMockLocation", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <Label htmlFor="requireDeviceFingerprint">
                Require device fingerprint
              </Label>
              <Switch
                id="requireDeviceFingerprint"
                checked={effective.requireDeviceFingerprint}
                onCheckedChange={(v) =>
                  setBoolean("requireDeviceFingerprint", v)
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3">
              <Label htmlFor="blockDuplicateLocationReplay">
                Block duplicate location replay
              </Label>
              <Switch
                id="blockDuplicateLocationReplay"
                checked={effective.blockDuplicateLocationReplay}
                onCheckedChange={(v) =>
                  setBoolean("blockDuplicateLocationReplay", v)
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Duplicate location replay window (seconds)</Label>
              <Input
                type="number"
                value={effective.duplicateLocationReplayWindowSeconds}
                onChange={(e) =>
                  setNumeric(
                    "duplicateLocationReplayWindowSeconds",
                    e.target.value,
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          {isHistoryLoading ? (
            <p className="text-sm text-muted-foreground">Loading history...</p>
          ) : historyData && historyData.length > 0 ? (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {historyData.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border/70 bg-card/60 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {entry.changedBy?.displayName || entry.changedBy?.username || "Unknown"}
                      <span className="ml-2 text-xs text-muted-foreground uppercase">
                        {entry.changedBy?.role || "admin"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.createdAt), "MMM dd, yyyy HH:mm:ss")}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    IP: {entry.ipAddress || "n/a"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {entry.changedKeys.length > 0 ? (
                      entry.changedKeys.map((key) => (
                        <span
                          key={`${entry.id}-${key}`}
                          className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                        >
                          {key}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No changed keys captured
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No geofence settings changes recorded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <FullScreenLoader show={saveMutation.isPending} operation="saving" />
    </div>
  );
}
