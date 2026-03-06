import { describe, expect, it } from "vitest";
import { getSparklineOptions } from "./ChartConfig";

describe("getSparklineOptions", () => {
  it("returns rose color for positive trend", () => {
    const options = getSparklineOptions(true);
    expect(options.chart.type).toBe("line");
    expect(options.colors).toEqual(["#f43f5e"]);
    expect(options.tooltip.y.formatter(12000)).toBe("12,000");
  });

  it("returns blue color for negative trend", () => {
    const options = getSparklineOptions(false);
    expect(options.colors).toEqual(["#3b82f6"]);
    expect(options.grid.show).toBe(false);
  });
});
