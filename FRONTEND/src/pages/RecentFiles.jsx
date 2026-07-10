import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Eye,
  Loader2,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  card,
  subtleHover,
  chip,
} from "@/components/dashboard/dashboard-tokens";
import { RecentFilesView } from "@/components/recent/RecentFilesView";
import { listActivities, getActivityStats } from "../../api/activities.js";

/* ───────────────────────── Stats Row ───────────────────────── */

function StatsRow({ stats, loading }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatMini
        icon={Eye}
        label="Opened today"
        value={loading ? "—" : String(stats?.openedToday ?? 0)}
      />
      <StatMini
        icon={Upload}
        label="Uploaded today"
        value={loading ? "—" : String(stats?.uploadedToday ?? 0)}
      />
      <StatMini
        icon={TrendingUp}
        label="This week"
        value={loading ? "—" : String(stats?.thisWeek ?? 0)}
      />
      <StatMini
        icon={Zap}
        label="Avg. per day"
        value={loading ? "—" : String(stats?.avgPerDay ?? 0)}
        accent
      />
    </div>
  );
}

function StatMini({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border shrink-0",
          accent
            ? "border-accent/20 bg-accent/10 text-accent"
            : "border-primary/20 bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold tracking-tight text-foreground tabular-nums leading-none">
          {value}
        </div>
        <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Main Page ───────────────────────── */

export default function RecentFiles() {
  const { setIsOutletLoading } = useOutletContext?.() || {};
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (setIsOutletLoading) {
      setIsOutletLoading(statsLoading);
    }
    return () => {
      if (setIsOutletLoading) setIsOutletLoading(false);
    };
  }, [statsLoading, setIsOutletLoading]);

  // Fetch stats on mount
  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    getActivityStats()
      .then((data) => {
        if (!cancelled) {
          setStats(data.stats);
          setStatsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch activity stats:", err);
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Track total count from the first fetch
  const handleFetch = async (params) => {
    const result = await listActivities(params);
    // On initial load (no cursor), update total count estimate
    if (!params.cursor) {
      setTotalCount(result.items.length + (result.pagination?.hasNextPage ? "+" : ""));
    }
    return result;
  };

  return (
    <>
      {/* Page header */}
      <section
        className={`${card} ${subtleHover} relative overflow-hidden p-6 md:p-10 animate-fade-in`}
      >
        {/* ambient glows */}
        <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-ambient-primary blur-3xl opacity-80 pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-ambient-primary blur-3xl opacity-50 pointer-events-none" />

        <div className="relative flex flex-col gap-8">
          <div className="max-w-xl">
            <div className={chip}>
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
              All activity tracked
            </div>
            <h1 className="mt-5 font-display text-3xl md:text-4xl font-semibold tracking-tight leading-[1.1] text-foreground">
              Recent <span className="text-gradient">Activity</span>
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed max-w-lg">
              Files you've opened and uploaded recently.{" "}
              {stats && (
                <span className="font-semibold text-foreground">
                  {stats.thisWeek} actions this week
                </span>
              )}
            </p>
          </div>

          {/* stat row */}
          <StatsRow stats={stats} loading={statsLoading} />
        </div>
      </section>

      {/* Main content card — powered by real API */}
      <RecentFilesView
        fetchFn={handleFetch}
        titleId="recent-heading"
        limit={20}
      />
    </>
  );
}
