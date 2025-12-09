import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Skeleton } from "../ui/skeleton";
import { FasketEmptyState } from "./FasketEmptyState";
import { cn } from "../ui/utils";

export type FasketTableColumn<T> = {
  key: string;
  title: React.ReactNode;
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
};

export type FasketTableProps<T> = {
  columns: Array<FasketTableColumn<T>>;
  data: T[];
  loading?: boolean;
  skeletonRows?: number;
  getRowId?: (row: T, index: number) => string | number;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

export function FasketTable<T>({
  columns,
  data,
  loading = false,
  skeletonRows = 4,
  getRowId,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your filters or create a new record.",
  className,
}: FasketTableProps<T>) {
  const rows = loading ? Array.from({ length: skeletonRows }) : data;
  const renderEmpty = !loading && data.length === 0;

  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-border bg-card text-card-foreground", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={cn("text-muted-foreground font-semibold", col.className)}>
                {col.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderEmpty ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-6">
                <FasketEmptyState title={emptyTitle} description={emptyDescription} />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => {
              const id = loading ? index : getRowId?.(row as T, index) ?? index;
              return (
                <TableRow key={id}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn("align-middle", col.className)}>
                      {loading ? <Skeleton className="h-4 w-24" /> : col.render(row as T, index)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
