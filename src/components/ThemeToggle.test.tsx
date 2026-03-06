import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    document.documentElement.className = "";
    document.body.className = "";
  });

  it("renders light mode by default and toggles to dark", () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "다크 모드 전환" });
    expect(button).toHaveTextContent("Light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    fireEvent.click(button);

    expect(button).toHaveTextContent("Dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });
});
