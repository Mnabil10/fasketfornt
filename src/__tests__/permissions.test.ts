import { describe, expect, it } from "vitest";
import { hasCapability } from "../auth/permissions";

describe("permissions", () => {
  it("grants admin all capabilities", () => {
    expect(hasCapability("ADMIN", "automation:replay")).toBe(true);
    expect(hasCapability("ADMIN", "reports:profit")).toBe(true);
  });

  it("restricts staff from profit", () => {
    expect(hasCapability("STAFF", "reports:profit")).toBe(false);
    expect(hasCapability("STAFF", "automation:view")).toBe(true);
  });

  it("allows finance to view profit but not automation replay", () => {
    expect(hasCapability("FINANCE", "reports:profit")).toBe(true);
    expect(hasCapability("FINANCE", "automation:replay")).toBe(false);
  });
});
