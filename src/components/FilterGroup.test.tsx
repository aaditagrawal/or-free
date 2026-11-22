import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterGroup } from "./FilterGroup";

const OPTIONS = Array.from({ length: 22 }, (_, i) => `param_${String(i).padStart(2, "0")}`);

describe("FilterGroup", () => {
  it("expands and collapses truncated options inline", async () => {
    const user = userEvent.setup();
    render(
      <FilterGroup
        title="Parameters"
        options={OPTIONS}
        selected={[]}
        onToggle={vi.fn()}
        maxVisible={18}
      />,
    );

    expect(screen.queryByText(/in ⌘K/)).toBeNull();
    expect(screen.queryByRole("button", { name: "param_20" })).toBeNull();

    const toggle = screen.getByRole("button", { name: /Show 4 more/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    await user.click(toggle);
    expect(screen.getByRole("button", { name: "param_20" })).not.toBeNull();
    const collapse = screen.getByRole("button", { name: /Show fewer/i });
    expect(collapse.getAttribute("aria-expanded")).toBe("true");

    await user.click(collapse);
    expect(screen.queryByRole("button", { name: "param_20" })).toBeNull();
  });

  it("keeps selected options visible while collapsed", () => {
    render(
      <FilterGroup
        title="Parameters"
        options={OPTIONS}
        selected={["param_21"]}
        onToggle={vi.fn()}
        maxVisible={18}
      />,
    );

    expect(screen.getByRole("button", { name: "param_21" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: /Show 3 more/i })).not.toBeNull();
  });

  it("renders no toggle when everything fits", () => {
    render(
      <FilterGroup
        title="Providers"
        options={["a", "b"]}
        selected={[]}
        onToggle={vi.fn()}
        maxVisible={18}
      />,
    );
    expect(screen.queryByRole("button", { name: /Show/i })).toBeNull();
  });
});
