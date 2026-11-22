import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createDefaultExplorerState } from "../lib/urlState";
import type { ProviderMode } from "../types/explorer";
import { Toolbar } from "./Toolbar";

const FACETS = {
  providers: [],
  inputModalities: [],
  outputModalities: [],
  instructTypes: [],
  supportedParameters: [],
};

function renderToolbar(providerMode: ProviderMode, onProviderModeChange = vi.fn()) {
  render(
    <Toolbar
      state={createDefaultExplorerState(providerMode)}
      facets={FACETS}
      onUpdate={vi.fn()}
      onToggleListFilter={vi.fn()}
      onOpenPalette={vi.fn()}
      onClearFilters={vi.fn()}
      onProviderModeChange={onProviderModeChange}
    />,
  );
  return onProviderModeChange;
}

describe("Toolbar", () => {
  it("replaces the Strict/Incomplete selector with a context length checkbox", async () => {
    const user = userEvent.setup();
    const onProviderModeChange = renderToolbar("include_incomplete");

    expect(screen.queryByRole("combobox", { name: "Provider mode" })).toBeNull();

    const checkbox = screen.getByRole("checkbox", {
      name: "Require provider-reported context length",
    });
    expect(checkbox).toHaveProperty("checked", false);

    await user.click(checkbox);
    expect(onProviderModeChange).toHaveBeenCalledWith("strict");
  });

  it("reflects strict mode as a checked box and unchecks back to include_incomplete", async () => {
    const user = userEvent.setup();
    const onProviderModeChange = renderToolbar("strict");

    const checkbox = screen.getByRole("checkbox", {
      name: "Require provider-reported context length",
    });
    expect(checkbox).toHaveProperty("checked", true);

    await user.click(checkbox);
    expect(onProviderModeChange).toHaveBeenCalledWith("include_incomplete");
  });
});
