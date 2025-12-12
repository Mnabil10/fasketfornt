import React from "react";
import Forbidden from "../components/auth/Forbidden";
import { Capability, usePermissions } from "./permissions";

export function RequireCapability({ capability, children }: { capability: Capability; children: React.ReactNode }) {
  const perms = usePermissions();
  if (!perms.has(capability)) {
    return <Forbidden />;
  }
  return <>{children}</>;
}

export default RequireCapability;
