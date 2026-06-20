import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: string;
}

export function Skeleton({ className, width, height = "1rem", rounded = "rounded" }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse bg-gray-200", rounded, className)}
      style={{ width, height }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 p-4 space-y-3">
      <Skeleton height="0.75rem" width="40%" />
      <Skeleton height="1.5rem" width="60%" />
      <Skeleton height="0.75rem" width="30%" />
    </div>
  );
}

export function ChartSkeleton({ height = "250px" }: { height?: string }) {
  return <Skeleton height={height} width="100%" rounded="rounded-lg" />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3">
          <Skeleton height="1rem" width="40%" />
          <Skeleton height="1rem" width="25%" />
          <Skeleton height="1rem" width="20%" />
        </div>
      ))}
    </div>
  );
}
