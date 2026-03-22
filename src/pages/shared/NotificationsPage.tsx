import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", { limit: 50 }],
    queryFn: async () => {
      const res = await notificationsAPI.getNotifications({ limit: 50, page: 1 });
      return res.data.data;
    },
  });

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      const res = await notificationsAPI.getUnreadCount();
      return res.data.data.unreadCount as number;
    },
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
    onError: () => toast.error("Could not update notification"),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      toast.success("All notifications marked read");
    },
    onError: () => toast.error("Could not mark all as read"),
  });

  const notifications = data?.notifications ?? [];
  const hasUnreadOnPage = notifications.some(
    (n: { isRead: boolean }) => !n.isRead,
  );
  const canMarkAll =
    hasUnreadOnPage ||
    (typeof unreadData === "number" && unreadData > 0);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading notifications…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Announcements and messages for your account
            {typeof unreadData === "number" && (
              <span className="ml-2 text-foreground font-medium">
                · {unreadData} unread
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-border self-start sm:self-auto"
          disabled={markAll.isPending || !canMarkAll}
          onClick={() => markAll.mutate()}
        >
          <CheckCheck className="h-4 w-4 mr-2" />
          Mark all read
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No notifications yet.
            </CardContent>
          </Card>
        ) : (
          notifications.map(
            (n: {
              id: number;
              title: string;
              message: string;
              type: string;
              priority: string;
              isRead: boolean;
              createdAt: string;
              course?: { code?: string; name?: string };
            }) => (
              <Card
                key={n.id}
                className={cn(
                  "border-border bg-card transition-colors",
                  !n.isRead && "border-primary/25 bg-primary/[0.03]",
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-foreground pr-2">
                      {n.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {n.type}
                      </Badge>
                      {n.priority === "high" && (
                        <Badge className="text-[10px] bg-warning/15 text-warning border-warning/30">
                          High priority
                        </Badge>
                      )}
                      {!n.isRead && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-primary/25">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      {format(new Date(n.createdAt), "MMM d, yyyy · HH:mm")}
                    </span>
                    {n.course && (
                      <span className="text-muted-foreground">
                        {n.course.code ?? n.course.name}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {n.message}
                  </p>
                  {!n.isRead && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8"
                      disabled={markRead.isPending}
                      onClick={() => markRead.mutate(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            ),
          )
        )}
      </div>
    </div>
  );
}
