import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AIAnalysisSkeleton from "./AIAnalysisSkeleton";

describe("AIAnalysisSkeleton", () => {
  it("renders loading skeleton blocks", () => {
    const { container } = render(<AIAnalysisSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});
