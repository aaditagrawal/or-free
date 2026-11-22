import { describe, expect, it } from "vitest";
import type { OpenRouterModel } from "../types/openrouter";
import { selectActiveModels, toDerivedModel } from "./models";
import { adaptOrcaResponse } from "./orca";
import { mergeModelSources } from "./openrouter";
import { assessPricing, findDescribedCharges } from "./pricing";

function buildModel(overrides: Partial<OpenRouterModel>): OpenRouterModel {
  return {
    id: "provider/model",
    canonical_slug: "provider-model",
    name: "Model",
    created: 1700000000,
    pricing: { prompt: "0", completion: "0" },
    context_length: 8192,
    architecture: { tokenizer: "Other", input_modalities: ["text"], output_modalities: ["text"] },
    top_provider: { context_length: 8192, max_completion_tokens: 4096, is_moderated: false },
    supported_parameters: [],
    description: "A general purpose model.",
    ...overrides,
  };
}

describe("assessPricing", () => {
  it("treats all-zero pricing with no other evidence as free", () => {
    expect(assessPricing(buildModel({}))).toEqual({ status: "free", notes: [] });
  });

  it("flags zero token prices contradicted by a per-song price in the description", () => {
    // Mirrors the live Lyria 3 Pro Preview payload: prompt/completion are "0"
    // but generation is billed per song.
    const lyriaLike = buildModel({
      id: "google/lyria-3-pro-preview",
      description: "Full-length songs are priced at $0.08 per song. Lyria 3 is Google's family...",
    });

    const result = assessPricing(lyriaLike);
    expect(result.status).toBe("unverified");
    expect(result.notes.join(" ")).toContain("$0.08");
    expect(toDerivedModel(lyriaLike).isFree).toBe(false);
  });

  it("does not flag descriptions that only mention $0", () => {
    expect(
      assessPricing(buildModel({ description: "Costs $0 per request on this tier." })).status,
    ).toBe("free");
  });

  it("requires evidence for audio generation even without a dollar amount in the description", () => {
    const model = buildModel({ architecture: { output_modalities: ["audio"] } });
    expect(assessPricing(model).status).toBe("unverified");
    expect(
      assessPricing({ ...model, pricing: { ...model.pricing, audio_output: "0" } }).status,
    ).toBe("free");
  });

  it("marks non-token charges as paid", () => {
    const result = assessPricing(
      buildModel({ pricing: { prompt: "0", completion: "0", request: "0.002" } }),
    );
    expect(result.status).toBe("paid");
    expect(result.notes).toContain("Request is charged separately");
  });

  it("marks tiered overrides with non-zero rates as paid", () => {
    const result = assessPricing(
      buildModel({
        pricing: {
          prompt: "0",
          completion: "0",
          overrides: [{ min_prompt_tokens: 200000, prompt: "0.000002", completion: "0" }],
        },
      }),
    );
    expect(result.status).toBe("paid");
  });

  it("treats missing, negative and unparsable token prices as unverified", () => {
    expect(assessPricing(buildModel({ pricing: { prompt: null, completion: null } })).status).toBe(
      "unverified",
    );
    expect(assessPricing(buildModel({ pricing: { prompt: "-1", completion: "-1" } })).status).toBe(
      "unverified",
    );
    expect(assessPricing(buildModel({ pricing: { prompt: "abc", completion: "0" } })).status).toBe(
      "unverified",
    );
  });

  it("treats a non-zero models.dev cost as conflicting evidence", () => {
    const result = assessPricing(
      buildModel({ models_dev: { id: "provider/model", cost: { input: 0.5, output: 1 } } }),
    );
    expect(result.status).toBe("unverified");
  });

  it("applies the models.dev cost check after merging sources", () => {
    const merged = mergeModelSources({ data: [buildModel({})] }, undefined, {
      openrouter: {
        id: "openrouter",
        models: { "provider/model": { id: "provider/model", cost: { input: 2, output: 4 } } },
      },
    });
    expect(toDerivedModel(merged!.data[0]).pricingStatus).toBe("unverified");
  });

  it("keeps paid token prices paid", () => {
    expect(
      assessPricing(buildModel({ pricing: { prompt: "0.000001", completion: "0" } })).status,
    ).toBe("paid");
  });
});

describe("findDescribedCharges", () => {
  it("finds dollar and USD amounts above zero", () => {
    expect(findDescribedCharges("Clips are $0.04 each, or 2 USD per batch; $0 otherwise.")).toEqual(
      ["$0.04", "2 USD"],
    );
  });
});

describe("free selection across sources", () => {
  it("keeps a conflicting ORCA fee when the same ID is in both catalogs", () => {
    const canonical = buildModel({});
    const alternate = buildModel({ pricing: { ...canonical.pricing, request: "0.01" } });
    const merged = mergeModelSources({ data: [canonical] }, { data: [alternate] });
    expect(merged?.data).toHaveLength(1);
    expect(toDerivedModel(merged!.data[0]).pricingStatus).toBe("unverified");
  });

  it("excludes unverified and non-token-charged models from the free filter", () => {
    const models = [
      buildModel({ id: "free" }),
      buildModel({ id: "per-song", description: "Priced at $0.08 per song." }),
      buildModel({
        id: "per-image",
        pricing: { prompt: "0", completion: "0", image_output: "0.03" },
      }),
    ];

    expect(
      selectActiveModels(models, "include_incomplete", "free", "2026-02-09").map((m) => m.id),
    ).toEqual(["free"]);
    expect(selectActiveModels(models, "include_incomplete", "all", "2026-02-09")).toHaveLength(3);
  });

  it("does not treat ORCA models with null pricing as free unless the id says :free", () => {
    const nullPricing = {
      audio_cache_write: null,
      audio_input: null,
      image_input: null,
      image_output: null,
      per_request: null,
      reasoning_output: null,
      text_cache_read: null,
      text_cache_write: null,
      text_input: null,
      text_output: null,
      tiers: null,
    };
    const provider = {
      chat_completions: true,
      completions: false,
      context_length: 8192,
      limits: {
        image_input_tokens: null,
        images_per_input: null,
        requests_per_day: null,
        requests_per_minute: null,
        text_input_tokens: null,
        text_output_tokens: 1024,
      },
      moderated: false,
      provider_id: "p",
      provider_name: "P",
      provider_region: null,
      supported_parameters: [],
    };
    const base = {
      author_name: "Author",
      created_at: "2026-01-01T00:00:00Z",
      input_modalities: ["text"],
      output_modalities: ["audio"],
    };

    const adapted = adaptOrcaResponse({
      models: [
        {
          ...base,
          id: "google/lyria-like",
          name: "Null priced",
          providers: [{ ...provider, pricing: nullPricing }],
        },
        {
          ...base,
          id: "vendor/model:free",
          name: "Free variant",
          providers: [{ ...provider, pricing: nullPricing }],
        },
        {
          ...base,
          id: "vendor/per-request",
          name: "Per request",
          providers: [
            {
              ...provider,
              pricing: { ...nullPricing, text_input: "0", text_output: "0", per_request: "0.01" },
            },
          ],
        },
      ],
    });

    const statuses = Object.fromEntries(
      adapted.data.map((model) => [model.id, toDerivedModel(model).pricingStatus]),
    );
    expect(statuses).toEqual({
      "google/lyria-like": "unverified",
      "vendor/model:free": "free",
      "vendor/per-request": "paid",
    });
  });
});
