import * as React from "react";

import { cn } from "./utils";

export const H2 = ({children}:{children:React.ReactNode}) =>
    <h2 className="font-display text-2xl font-semibold tracking-tight">{children}</h2>;