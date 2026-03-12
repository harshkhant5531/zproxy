/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
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
  Download,
  Eye,
  EyeOff,
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
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { attendanceAPI } from "@/lib/api";
import { motion } from "framer-motion";

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
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
  >
    <Card
      className={`overflow-hidden border-l-4 ${color} bg-gradient-to-br from-slate-900 to-slate-800 hover:shadow-lg transition-all duration-300`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <motion.h3
              className="text-3xl font-bold text-white mt-2"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: delay + 0.2 }}
            >
              {value}
            </motion.h3>
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          </div>
          <motion.div
            className={`p-3 rounded-lg ${color} opacity-20`}
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", delay: delay + 0.3 }}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const RiskLevelBadge = ({ level }: { level: string }) => {
  const colorMap = {
    critical: "bg-red-900 text-red-200 border-red-700",
    high: "bg-orange-900 text-orange-200 border-orange-700",
    moderate: "bg-yellow-900 text-yellow-200 border-yellow-700",
    low: "bg-green-900 text-green-200 border-green-700",
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
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="overflow-x-auto"
  >
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-700 bg-slate-800">
          <th className="text-left px-4 py-3 font-semibold text-slate-300">
            Student
          </th>
          <th className="text-left px-4 py-3 font-semibold text-slate-300">
            Flagged
          </th>
          <th className="text-left px-4 py-3 font-semibold text-slate-300">
            Rate
          </th>
          <th className="text-left px-4 py-3 font-semibold text-slate-300">
            IPs
          </th>
          <th className="text-left px-4 py-3 font-semibold text-slate-300">
            Score
          </th>
          <th className="text-left px-4 py-3 font-semibold text-slate-300">
            Risk
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <motion.tr
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + idx * 0.05 }}
            className="border-b border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <td className="px-4 py-3 text-slate-300">[#{row.studentId}]</td>
            <td className="px-4 py-3 font-medium text-orange-400">
              {row.flaggedCount}
            </td>
            <td className="px-4 py-3 text-slate-300">{row.flagRate}%</td>
            <td className="px-4 py-3 text-slate-300">{row.uniqueIps}</td>
            <td className="px-4 py-3">
              <motion.div
                className="w-full bg-slate-700 rounded-full h-2 overflow-hidden max-w-20"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: delay + idx * 0.05 + 0.2 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-500 to-red-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${row.anomalyScore}%` }}
                  transition={{
                    delay: delay + idx * 0.05 + 0.3,
                    duration: 0.8,
                  }}
                />
              </motion.div>
            </td>
            <td className="px-4 py-3">
              <RiskLevelBadge level={row.riskLevel} />
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  </motion.div>
);

export default function ProxyAuditPage() {
  const [filters, setFilters] = useState({
    courseId: "",
    studentId: "",
    from: "",
    to: "",
  });
  const [showFilters, setShowFilters] = useState(false);

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

  if (isLoading) return <FullScreenLoader show={true} />;

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="bg-red-900 border-red-700">
          <CardContent className="p-6">
            <p className="text-red-200">Error loading proxy audit data</p>
          </CardContent>
        </Card>
      </div>
    );

  const analytics = auditData?.analytics || {};
  const records = auditData?.records || [];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              Proxy Activity Audit
            </h1>
            <p className="text-slate-400 mt-2">
              Real-time analysis & risk assessment
            </p>
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="border-slate-600"
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
            className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6"
          >
            <div className="grid grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Course ID"
                value={filters.courseId}
                onChange={(e) =>
                  setFilters({ ...filters, courseId: e.target.value })
                }
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
              <input
                type="text"
                placeholder="Student ID"
                value={filters.studentId}
                onChange={(e) =>
                  setFilters({ ...filters, studentId: e.target.value })
                }
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
              <input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters({ ...filters, from: e.target.value })
                }
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AnimatedStatCard
          title="Total Flagged"
          value={analytics.summary?.totalFlagged || 0}
          subtitle="Proxy-suspected events"
          icon={AlertTriangle}
          color="border-red-500 bg-red-500"
          delay={0}
        />
        <AnimatedStatCard
          title="Detection Rate"
          value={`${analytics.summary?.detectionAccuracy || 0}%`}
          subtitle="Of all attendance"
          icon={TrendingUp}
          color="border-orange-500 bg-orange-500"
          delay={0.1}
        />
        <AnimatedStatCard
          title="Students at Risk"
          value={analytics.summary?.uniqueStudentsAtRisk || 0}
          subtitle="With flag history"
          icon={Users}
          color="border-yellow-500 bg-yellow-500"
          delay={0.2}
        />
        <AnimatedStatCard
          title="Critical Cases"
          value={analytics.summary?.criticalRiskCount || 0}
          subtitle="Immediate attention"
          icon={Activity}
          color="border-red-600 bg-red-600"
          delay={0.3}
        />
      </div>

      {/* Extended Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AnimatedStatCard
          title="High Risk"
          value={analytics.summary?.highRiskCount || 0}
          subtitle="Requires review"
          icon={AlertTriangle}
          color="border-orange-600 bg-orange-600"
          delay={0.4}
        />
        <AnimatedStatCard
          title="Moderate Risk"
          value={analytics.summary?.moderateRiskCount || 0}
          subtitle="Monitor closely"
          icon={TrendingUp}
          color="border-yellow-600 bg-yellow-600"
          delay={0.5}
        />
        <AnimatedStatCard
          title="Unique IPs"
          value={analytics.topIpAddresses?.length || 0}
          subtitle="Tracked addresses"
          icon={Network}
          color="border-cyan-600 bg-cyan-600"
          delay={0.6}
        />
        <AnimatedStatCard
          title="Device Types"
          value={analytics.deviceRiskAnalysis?.length || 0}
          subtitle="Active devices"
          icon={Smartphone}
          color="border-purple-600 bg-purple-600"
          delay={0.7}
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
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Daily Trend Analysis
                </CardTitle>
                <CardDescription className="text-slate-400">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
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
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  Hourly Risk Distribution
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Flagged events by hour
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={analytics.hotspotHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="hour"
                      stroke="#94a3b8"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
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
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Weekly Pattern
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    By day of week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={analytics.dayOfWeekAnalysis}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="day" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
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
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Network className="w-5 h-5 text-teal-500" />
                  Top IP Addresses
                </CardTitle>
                <CardDescription className="text-slate-400">
                  By frequency & risk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topIpAddresses.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="ipAddress"
                      stroke="#94a3b8"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
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
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan-500" />
                IP Cluster Analysis
              </CardTitle>
              <CardDescription className="text-slate-400">
                Multiple students on same IP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.sharedIpClusters.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="ipAddress"
                    stroke="#94a3b8"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
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
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-green-500" />
                  Device Risk Profile
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Risk by device type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={analytics.deviceRiskAnalysis}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis
                      dataKey="device"
                      type="category"
                      stroke="#94a3b8"
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
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
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-pink-500" />
                  High-Risk Students
                </CardTitle>
                <CardDescription className="text-slate-400">
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
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                Peak Risk Hours
              </CardTitle>
              <CardDescription className="text-slate-400">
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
                    className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg border border-slate-700"
                  >
                    <span className="font-bold text-white w-12">
                      {hour.hour}:00
                    </span>
                    <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-500 to-pink-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${hour.riskPercentage}%` }}
                        transition={{
                          delay: 1.1 + idx * 0.1 + 0.2,
                          duration: 0.8,
                        }}
                      />
                    </div>
                    <span className="font-semibold text-red-400">
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
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-lime-500" />
                Student Pairs Linked
              </CardTitle>
              <CardDescription className="text-slate-400">
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
                      className="flex items-center justify-between p-2 bg-slate-800 rounded border border-slate-700 text-sm"
                    >
                      <span className="text-slate-300">
                        Student {pair.studentA} ↔ {pair.studentB}
                      </span>
                      <Badge className="bg-red-900 text-red-200 text-xs">
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
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Flagged Records
                </div>
                <span className="text-sm font-normal text-slate-400">
                  {records.length} total
                </span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Recent proxy-flagged events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800">
                      <th className="text-left px-4 py-2 font-semibold text-slate-300">
                        Student
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-300">
                        Course
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-300">
                        Time
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-300">
                        Risk
                      </th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-300">
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
                        className="border-b border-slate-700 hover:bg-slate-800"
                      >
                        <td className="px-4 py-2 text-slate-300">
                          {record.student?.studentProfile?.fullName ||
                            record.student?.username}
                        </td>
                        <td className="px-4 py-2 text-slate-400">
                          {record.session?.course?.code}
                        </td>
                        <td className="px-4 py-2 text-slate-400 text-xs">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <RiskLevelBadge level={record.riskLabel} />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-yellow-500 to-red-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${record.riskScore}%` }}
                                transition={{
                                  delay: 1.3 + idx * 0.03 + 0.1,
                                  duration: 0.6,
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-orange-400 w-6">
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
        className="mt-8 text-center text-slate-500 text-xs"
      >
        Last updated:{" "}
        {analytics.generatedAt
          ? new Date(analytics.generatedAt).toLocaleString()
          : "N/A"}
      </motion.div>
    </div>
  );
}
