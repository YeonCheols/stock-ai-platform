import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("filters falsy values and joins classes", () => {
    expect(cn("px-2", false && "hidden", undefined, "py-1")).toBe("px-2 py-1");
  });

  it("merges conflicting tailwind classes", () => {
    expect(cn("p-2", "p-4", "text-sm", "text-lg")).toBe("p-4 text-lg");
  });
});
