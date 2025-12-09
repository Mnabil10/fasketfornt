import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../ui/utils";

type FasketCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

export function FasketCard({ title, description, actions, className, children, ...rest }: FasketCardProps) {
  return (
    <Card
      className={cn(
        "rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] bg-card text-card-foreground border border-border",
        className
      )}
      {...rest}
    >
      {(title || description || actions) && (
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div className="space-y-1">
            {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
            {description && <CardDescription className="text-sm text-muted-foreground">{description}</CardDescription>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
