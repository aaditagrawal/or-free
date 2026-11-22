import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toDerivedModel } from "../lib/models";
import type { OpenRouterModel } from "../types/openrouter";
import { ConfigGenerator } from "./ConfigGenerator";

function model(id: string, name: string): OpenRouterModel {
  return {
    id,
    canonical_slug: id,
    name,
    created: 1700000000,
    pricing: { prompt: "0", completion: "0" },
    context_length: 8192,
    architecture: { tokenizer: "Other", input_modalities: ["text"], output_modalities: ["text"] },
    top_provider: { context_length: 8192, max_completion_tokens: 4096 },
    supported_parameters: [],
  };
}

const MODELS = [
  model("alpha/one:free", "Alpha One"),
  model("alpha/two:free", "Alpha Two"),
  model("beta/three:free", "Beta Three"),
].map((m) => toDerivedModel(m, "2026-02-09"));

function modelButton(name: string) {
  return within(screen.getByRole("group", { name: "Free models" })).getByRole("button", {
    name: new RegExp(name),
  });
}

describe("ConfigGenerator", () => {
  it("adds search matches to the selection without dropping earlier picks", async () => {
    const user = userEvent.setup();
    render(<ConfigGenerator models={MODELS} onBack={vi.fn()} />);

    await user.click(modelButton("Beta Three"));
    expect(modelButton("Beta Three").getAttribute("aria-pressed")).toBe("true");

    await user.type(screen.getByRole("searchbox", { name: "Search free models" }), "alpha");
    await user.click(screen.getByRole("button", { name: "Add 2 matches" }));

    expect(screen.getByRole("status").textContent).toContain("3 selected");
    expect(screen.getByRole("status").textContent).toContain("1 hidden by search");
    expect(modelButton("Alpha One").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "All matches selected" })).toHaveProperty(
      "disabled",
      true,
    );

    const preview = screen.getByText(/"beta\/three:free"/);
    expect(preview).not.toBeNull();
  });

  it("clears every selection explicitly", async () => {
    const user = userEvent.setup();
    render(<ConfigGenerator models={MODELS} onBack={vi.fn()} />);

    const clear = screen.getByRole("button", { name: "Clear all selections" });
    expect(clear).toHaveProperty("disabled", true);

    await user.click(screen.getByRole("button", { name: "Select all matches" }));
    expect(screen.getByRole("status").textContent).toContain("3 selected");

    await user.click(clear);
    expect(screen.getByRole("status").textContent).toContain("0 selected");
    expect(modelButton("Alpha One").getAttribute("aria-pressed")).toBe("false");
  });
});
