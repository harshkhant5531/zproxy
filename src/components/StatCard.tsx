import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
  iconClassName?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  iconClassName,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "app-card stat-card-enter motion-surface group relative overflow-hidden",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1 pr-3">
            <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight text-foreground motion-stat leading-none">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground/75 truncate">
                {subtitle}
              </p>
            )}
            {trend && (
              <div
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold mt-1 px-2 py-0.5 rounded-full border",
                  trend.value >= 0
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                    : "text-destructive bg-destructive/10 border-destructive/25",
                )}
              >
                <span>{trend.value >= 0 ? "↑" : "↓"}</span>
                <span>{Math.abs(trend.value)}%</span>
                <span className="text-[10px] font-normal opacity-80">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "rounded-2xl bg-primary/10 dark:bg-primary/15 p-3 border border-primary/20 flex-shrink-0 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110",
              iconClassName,
            )}
          >
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
