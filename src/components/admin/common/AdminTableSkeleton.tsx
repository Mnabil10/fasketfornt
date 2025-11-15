import React from "react";
import { Skeleton } from "../../ui/skeleton";

type AdminTableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function AdminTableSkeleton({ rows = 5, columns = 5 }: AdminTableSkeletonProps) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {[...Array(columns)].map((__, colIndex) => (
            <Skeleton key={colIndex} className="h-10 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
