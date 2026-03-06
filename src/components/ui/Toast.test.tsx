import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Toast from "./Toast";

describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when closed", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Toast message="error" isOpen={false} onClose={onClose} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders message and auto closes after timeout", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast message="테스트 토스트" isOpen onClose={onClose} tone="error" />);

    expect(screen.getByText("테스트 토스트")).toBeInTheDocument();
    vi.advanceTimersByTime(3200);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clears timer when toast closes before timeout", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { rerender } = render(
      <Toast message="정리 테스트" isOpen onClose={onClose} tone="info" />
    );

    vi.advanceTimersByTime(1000);
    rerender(<Toast message="정리 테스트" isOpen={false} onClose={onClose} tone="info" />);
    vi.advanceTimersByTime(5000);

    expect(onClose).not.toHaveBeenCalled();
  });
});
