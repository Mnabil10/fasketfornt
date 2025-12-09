import * as React from "react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

export type FasketButtonProps = React.ComponentProps<typeof Button> & {
  loading?: boolean;
  icon?: React.ReactNode;
};

export const FasketButton = React.forwardRef<HTMLButtonElement, FasketButtonProps>(
  ({ className, children, loading = false, icon, disabled, ...rest }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <Button
        ref={ref}
        className={cn(
          "rounded-[var(--radius-md)] font-semibold flex items-center gap-2 transition-all shadow-[var(--shadow-card)]",
          loading ? "opacity-80 cursor-wait" : "",
          className
        )}
        disabled={isDisabled}
        {...rest}
      >
        {loading && <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />}
        {!loading && icon}
        <span className="whitespace-nowrap">{children}</span>
      </Button>
    );
  }
);
FasketButton.displayName = "FasketButton";
