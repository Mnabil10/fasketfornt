import * as React from "react";
import { cn } from "./utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm", className)}
      {...props}
      name={props.name} // مهم
    />
  )
);
Input.displayName = "Input";
export { Input };
