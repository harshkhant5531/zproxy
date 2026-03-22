/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";
import {
  AlertTriangle,
  TrendingUp,
  Users,
  Network,
  Activity,
  Clock,
  Smartphone,
  Filter,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { attendanceAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const AnimatedStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  delay?: number;
}) => (
  <Card
    className={cn(
      "overflow-hidden border border-border bg-card group transition-all duration-300",
      "hover:border-primary/30",
    )}
    style={{ animationDelay: `${delay}s` }}
  >
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-3xl font-bold tracking-tight text-foreground motion-stat">
            {value}
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium">
            {subtitle}
          </p>
        </div>
        <div
          className={cn(
            "p-3 rounded-xl border border-border bg-muted/20 transition-all duration-300",
            "group-hover:bg-primary/10 group-hover:scale-110",
            color.includes("destructive")
              ? "group-hover:bg-destructive/10"
              : "",
          )}
        >
          <Icon
            className={cn(
              "w-6 h-6",
              color.includes("destructive")
                ? "text-destructive"
                : "text-primary",
            )}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

const RiskLevelBadge = ({ level }: { level: string }) => {
  const colorMap = {
    critical: "bg-destructive/10 text-destructive border-destructive/20",
    high: "bg-warning/10 text-warning border-warning/20",
    moderate: "bg-warning/10 text-warning border-warning/20",
    low: "bg-success/10 text-success border-success/20",
  };
  return (
    <Badge className={`${colorMap[level as keyof typeof colorMap]} border`}>
      {level.toUpperCase()}
    </Badge>
  );
};

const AnimatedTable = ({
  data,
  delay = 0,
}: {
  data: any[];
  delay?: number;
}) => (
  <div
    className="overflow-x-auto"
    style={{ animationDelay: `${delay}s` }}
  >
    <table className="w-full min-w-[680px] text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/40">
          <th className="text-left px-4 py-3 font-semibold text-foreground">
            Student / ID
          </th>
          <th className="text-left px-4 py-3 font-semibold text-foreground">
            Flagged
          </th>
          <th className="text-left px-4 py-3 font-semibold text-foreground">
            Rate
          </th>
          <th className="text-left px-4 py-3 font-semibold text-foreground">
            IPs
          </th>
          <th className="text-left px-4 py-3 font-semibold text-foreground">
            Score
          </th>
          <th className="text-left px-4 py-3 font-semibold text-foreground">
            Risk
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr
            key={idx}
            className="border-b border-border hover:bg-muted/40 transition-colors"
            style={{ "--row-index": idx } as any}
          >
            <td className="px-4 py-4 text-foreground">
              <div className="font-medium">
                {row.studentName || `Student #${row.studentId}`}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                #{row.studentId}
                {row.rollNumber ? ` · ${row.rollNumber}` : ""}
              </div>
            </td>
            <td className="px-4 py-4 font-bold text-amber-500">
              {row.flaggedCount}
            </td>
            <td className="px-4 py-4 text-foreground font-medium">
              {row.flagRate}%
            </td>
            <td className="px-4 py-4 text-muted-foreground font-mono text-xs">
              {row.uniqueIps}
            </td>
            <td className="px-4 py-4">
              <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden max-w-20">
                <div
                  className="h-full bg-primary motion-progress"
                  style={{ width: `${row.anomalyScore}%` }}
                />
              </div>
            </td>
            <td className="px-4 py-4">
              <RiskLevelBadge level={row.riskLevel} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function ProxyAuditPage() {
  const [filters, setFilters] = useState({
    courseId: "",
    studentId: "",
    from: "",
    to: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [detailRecord, setDetailRecord] = useState<Record<
    string,
    unknown
  > | null>(null);

  const {
    data: auditData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["proxy-audit", filters],
    queryFn: async () => {
      const resp = await attendanceAPI.getProxyAudit(filters);
      return resp.data.data;
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading proxy audit...
          </span>
        </div>
      </div>
    );
  }

  if (error)
    return (
      <div className="flex items-center justify-center">
        <Card
                    className="bg-destructive/10 border-destructive/20 w-full max-w-md"
        >
          <CardContent className="p-5 sm:p-6">
            <p className="text-destructive">Error loading proxy audit data</p>
          </CardContent>
        </Card>
      </div>
    );

  const analytics = auditData?.analytics || {};
  const records = auditData?.records || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-1"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-warning" />
              Proxy Activity Audit
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Real-time analysis & risk assessment
            </p>
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="border-border self-start sm:self-auto"
          >
            {showFilters ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" /> Hide Filters
              </>
            ) : (
              <>
                <Filter className="w-4 h-4 mr-2" /> Show Filters
              </>
            )}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
            className="bg-card p-4 rounded-lg border border-border mb-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <input
                type="text"
                placeholder="Course ID"
                value={filters.courseId}
                onChange={(e) =>
                  setFilters({ ...filters, courseId: e.target.value })
                }
                className="px-3 py-2 bg-background border border-input rounded text-foreground text-sm"
              />
              <input
                type="text"
                placeholder="Student ID"
                value={filters.studentId}
                onChange={(e) =>
                  setFilters({ ...filters, studentId: e.target.value })
                }
                className="px-3 py-2 bg-background border border-input rounded text-foreground text-sm"
              />
              <input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters({ ...filters, from: e.target.value })
                }
                className="px-3 py-2 bg-background border border-input rounded text-foreground text-sm"
              />
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="px-3 py-2 bg-background border border-input rounded text-foreground text-sm"
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <AnimatedStatCard
          title="Total Flagged"
          value={analytics.summary?.totalFlagged || 0}
          subtitle="Proxy-suspected events"
          icon={AlertTriangle}
          color="border-destructive bg-destructive"
          delay={0}
        />
        <AnimatedStatCard
          title="Proxy flag rate"
          value={`${analytics.summary?.flagRatePercent ?? analytics.summary?.detectionAccuracy ?? 0}%`}
          subtitle="Attendance with proxy-class flags"
          icon={TrendingUp}
          color="border-warning bg-warning"
          delay={0.07}
        />
        <AnimatedStatCard
          title="Students at Risk"
          value={analytics.summary?.uniqueStudentsAtRisk || 0}
          subtitle="With flag history"
          icon={Users}
          color="border-warning bg-warning"
          delay={0.14}
        />
        <AnimatedStatCard
          title="Critical Cases"
          value={analytics.summary?.criticalRiskCount || 0}
          subtitle="Immediate attention"
          icon={Activity}
          color="border-destructive bg-destructive"
          delay={0.21}
        />
      </div>

      {/* Extended Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AnimatedStatCard
          title="High Risk"
          value={analytics.summary?.highRiskCount || 0}
          subtitle="Requires review"
          icon={AlertTriangle}
          color="border-warning bg-warning"
          delay={0.28}
        />
        <AnimatedStatCard
          title="Moderate Risk"
          value={analytics.summary?.moderateRiskCount || 0}
          subtitle="Monitor closely"
          icon={TrendingUp}
          color="border-warning bg-warning"
          delay={0.35}
        />
        <AnimatedStatCard
          title="Unique IPs"
          value={analytics.topIpAddresses?.length || 0}
          subtitle="Tracked addresses"
          icon={Network}
          color="border-info bg-info"
          delay={0.42}
        />
        <AnimatedStatCard
          title="Device Types"
          value={analytics.deviceRiskAnalysis?.length || 0}
          subtitle="Active devices"
          icon={Smartphone}
          color="border-info bg-info"
          delay={0.49}
        />
      </div>

      {/* Charts Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Trends */}
        {analytics.dailyTrends && analytics.dailyTrends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-info" />
                  Daily Trend Analysis
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Last 30 days flagged events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.dailyTrends}>
                    <defs>
                      <linearGradient
                        id="colorFlagged"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f97316"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f97316"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="flagged"
                      stroke="#f97316"
                      fillOpacity={1}
                      fill="url(#colorFlagged)"
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Hourly Risk */}
        {analytics.hotspotHours && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-info" />
                  Hourly Risk Distribution
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Flagged events by hour
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={analytics.hotspotHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="hour"
                      stroke="#64748b"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="flaggedCount" fill="#ef4444" />
                    <Bar dataKey="totalCount" fill="#64748b" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Charts Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Day of Week */}
        {analytics.dayOfWeekAnalysis &&
          analytics.dayOfWeekAnalysis.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-info" />
                    Weekly Pattern
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    By day of week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={analytics.dayOfWeekAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                        }}
                      />
                      <Bar dataKey="flagged" fill="#6366f1" />
                      <Bar dataKey="total" fill="#64748b" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

        {/* Top IP Addresses */}
        {analytics.topIpAddresses && analytics.topIpAddresses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Network className="w-5 h-5 text-info" />
                  Top IP Addresses
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  By frequency & risk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topIpAddresses.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="ipAddress"
                      stroke="#64748b"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar dataKey="totalEvents" fill="#14b8a6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Shared IP Clusters */}
      {analytics.sharedIpClusters && analytics.sharedIpClusters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-8"
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Network className="w-5 h-5 text-info" />
                IP Cluster Analysis
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Multiple students on same IP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.sharedIpClusters.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="ipAddress"
                    stroke="#64748b"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Bar dataKey="uniqueStudents" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Device Risk */}
      {analytics.deviceRiskAnalysis &&
        analytics.deviceRiskAnalysis.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-8"
          >
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-success" />
                  Device Risk Profile
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Risk by device type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={analytics.deviceRiskAnalysis}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" />
                    <YAxis
                      dataKey="device"
                      type="category"
                      stroke="#64748b"
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar dataKey="riskPercentage" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

      {/* Student Risk Profiles */}
      {analytics.studentRiskProfiles &&
        analytics.studentRiskProfiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mb-8"
          >
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-info" />
                  High-Risk Students
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Top 10 by anomaly score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatedTable
                  data={analytics.studentRiskProfiles.slice(0, 10)}
                  delay={1.0}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

      {/* Peak Risk Hours */}
      {analytics.peakRiskHours && analytics.peakRiskHours.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mb-8"
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-destructive" />
                Peak Risk Hours
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Highest risk time windows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.peakRiskHours.map((hour: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.1 + idx * 0.1 }}
                    className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg border border-border"
                  >
                    <span className="font-bold text-foreground w-12">
                      {hour.hour}:00
                    </span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-destructive to-info"
                        initial={{ width: 0 }}
                        animate={{ width: `${hour.riskPercentage}%` }}
                        transition={{
                          delay: 1.1 + idx * 0.1 + 0.2,
                          duration: 0.8,
                        }}
                      />
                    </div>
                    <span className="font-semibold text-destructive/90">
                      {hour.riskPercentage}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Linked Pairs */}
      {analytics.topLinkedPairs && analytics.topLinkedPairs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mb-8"
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-info" />
                Student Pairs Linked
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Frequently sharing same IP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {analytics.topLinkedPairs
                  .slice(0, 20)
                  .map((pair: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + idx * 0.03 }}
                      className="flex items-center justify-between p-2 bg-muted/40 rounded border border-border text-sm"
                    >
                      <span className="text-foreground">
                        Student {pair.studentA} ↔ {pair.studentB}
                      </span>
                      <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                        {pair.occurrences}x
                      </Badge>
                    </motion.div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Flagged Records */}
      {records.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="mb-8"
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Flagged Records
                </div>
                <span className="text-sm font-normal text-muted-foreground">
                  {records.length} total
                </span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Recent proxy-flagged events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2 font-semibold text-foreground">
                        Student
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-foreground">
                        Course
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-foreground">
                        Time
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-foreground">
                        Risk
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-foreground">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 15).map((record: any, idx: number) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.3 + idx * 0.03 }}
                        className="border-b border-border hover:bg-muted/40 cursor-pointer"
                        onClick={() => setDetailRecord(record)}
                        title="View integrity detail"
                      >
                        <td className="px-4 py-2 text-foreground">
                          {record.student?.studentProfile?.fullName ||
                            record.student?.username}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {record.session?.course?.code}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <RiskLevelBadge level={record.riskLabel} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-warning to-destructive"
                                initial={{ width: 0 }}
                                animate={{ width: `${record.riskScore}%` }}
                                transition={{
                                  delay: 1.3 + idx * 0.03 + 0.1,
                                  duration: 0.6,
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-warning/90 w-6">
                              {record.riskScore}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-8 text-center text-muted-foreground text-xs"
      >
        Last updated:{" "}
        {analytics.generatedAt
          ? new Date(analytics.generatedAt).toLocaleString()
          : "N/A"}
      </motion.div>

      <Sheet
        open={!!detailRecord}
        onOpenChange={(open) => {
          if (!open) setDetailRecord(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-lg border-border bg-background overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Integrity detail</SheetTitle>
            <SheetDescription>
              How this attendance was scored and which signals fired.
            </SheetDescription>
          </SheetHeader>
          {detailRecord && (
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Student
                </p>
                <p className="text-foreground font-medium mt-1">
                  {(detailRecord.student as any)?.studentProfile?.fullName ||
                    (detailRecord.student as any)?.username}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  ID {(detailRecord.student as any)?.id}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Session
                </p>
                <p className="text-foreground mt-1">
                  {(detailRecord.session as any)?.topic}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(detailRecord.session as any)?.course?.code}{" "}
                  {(detailRecord.session as any)?.subject?.name
                    ? `· ${(detailRecord.session as any).subject.name}`
                    : ""}
                </p>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">Risk:</span>
                <RiskLevelBadge level={String(detailRecord.riskLabel)} />
                <span className="text-xs font-semibold text-warning/90">
                  Score {String(detailRecord.riskScore)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Status: {String(detailRecord.status)}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Signals
                </p>
                <ul className="space-y-2">
                  {(
                    (detailRecord.proxyDetail as { signals?: { code: string; label: string; detail: string }[] })
                      ?.signals || []
                  ).map((s) => (
                    <li
                      key={s.code + s.label}
                      className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                    >
                      <p className="font-medium text-foreground text-xs">
                        {s.label}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                        {s.detail}
                      </p>
                    </li>
                  ))}
                  {!(
                    (detailRecord.proxyDetail as { signals?: unknown[] })
                      ?.signals || []
                  ).length && (
                    <li className="text-muted-foreground text-xs">
                      No structured signals; see raw notes below.
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Raw notes
                </p>
                <pre className="text-xs bg-muted/40 border border-border rounded-md p-3 whitespace-pre-wrap break-words font-mono text-muted-foreground">
                  {String(detailRecord.notes || "—")}
                </pre>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  IP:{" "}
                  <span className="font-mono text-foreground">
                    {String(detailRecord.ipAddress || "—")}
                  </span>
                </p>
                <p>
                  Device:{" "}
                  <span className="font-mono text-foreground break-all">
                    {String(detailRecord.deviceInfo || "—")}
                  </span>
                </p>
                <p>
                  Time:{" "}
                  {detailRecord.timestamp
                    ? new Date(
                        detailRecord.timestamp as string,
                      ).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
