import { Badge, type BadgeProps } from "../ui/badge";
import { cn } from "../ui/utils";

type Variant = "neutral" | "success" | "warning" | "danger" | "info";

const variantToClass: Record<Variant, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  warning: "bg-amber-100 text-amber-800 border border-amber-200",
  danger: "bg-red-100 text-red-800 border border-red-200",
  info: "bg-sky-100 text-sky-800 border border-sky-200",
};

export type FasketBadgeProps = Omit<BadgeProps, "variant"> & { tone?: Variant };

export function FasketBadge({ tone = "neutral", className, children, ...rest }: FasketBadgeProps) {
  return (
    <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", variantToClass[tone], className)} {...rest}>
      {children}
    </Badge>
  );
}
