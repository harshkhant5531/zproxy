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
        "bg-card border border-border shadow-sm stat-card-enter motion-surface group",
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1 pr-3">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight text-foreground motion-stat">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground/70 truncate">
                {subtitle}
              </p>
            )}
            {trend && (
              <div
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold mt-1 px-1.5 py-0.5 rounded-md",
                  trend.value >= 0
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    : "text-destructive bg-destructive/10",
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
              "rounded-xl bg-primary/10 dark:bg-primary/15 p-3 border border-primary/15 flex-shrink-0 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110",
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
