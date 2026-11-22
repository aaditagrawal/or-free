import type { PricingStatus } from "../types/explorer";
import type { OpenRouterModel, OpenRouterPricing } from "../types/openrouter";

export const PRICING_LABELS: Array<{ key: keyof OpenRouterPricing; label: string }> = [
  { key: "prompt", label: "Prompt" },
  { key: "completion", label: "Completion" },
  { key: "request", label: "Request" },
  { key: "image", label: "Image" },
  { key: "image_token", label: "Image token" },
  { key: "image_output", label: "Image output" },
  { key: "audio", label: "Audio" },
  { key: "audio_output", label: "Audio output" },
  { key: "input_audio_cache", label: "Audio cache" },
  { key: "web_search", label: "Web search" },
  { key: "internal_reasoning", label: "Internal reasoning" },
  { key: "input_cache_read", label: "Cache read" },
  { key: "input_cache_write", label: "Cache write" },
  { key: "input_cache_write_1h", label: "Cache write (1h)" },
  { key: "discount", label: "Discount" },
];

const LABEL_BY_KEY = new Map<string, string>(PRICING_LABELS.map(({ key, label }) => [key, label]));

// Keys that are not charges in their own right.
const NON_CHARGE_KEYS = new Set<string>(["prompt", "completion", "discount", "overrides"]);

export type PricingAssessment = {
  status: PricingStatus;
  notes: string[];
};

// Rates from additional provider-specific fields have no static type in the feed.
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- validate the raw rate at this boundary
function parseRate(value: unknown): number {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- only JSON numbers and numeric strings represent rates
  if (typeof value !== "number" && typeof value !== "string") return Number.NaN;
  const text = String(value).trim();
  const rate = Number(text);
  return text.length > 0 && Number.isFinite(rate) ? rate : Number.NaN;
}

function labelFor(key: string): string {
  return LABEL_BY_KEY.get(key) ?? key.replace(/_/g, " ");
}

// Matches "$0.08", "$ 2", "US$1.50", "0.04 USD". Amounts of zero are ignored so
// a description saying "$0 per request" does not flag a genuinely free model.
const MONEY_PATTERN = /(?:US)?\$\s?(\d+(?:[.,]\d+)?)|(\d+(?:\.\d+)?)\s?(?:USD|dollars?)\b/gi;

export function findDescribedCharges(description: string | undefined | null): string[] {
  if (!description) return [];
  const found: string[] = [];
  for (const match of description.matchAll(MONEY_PATTERN)) {
    const amount = Number((match[1] ?? match[2] ?? "").replace(",", "."));
    if (Number.isFinite(amount) && amount > 0) {
      found.push(match[0].trim());
    }
  }
  return found;
}

function assessOverrides(overrides: OpenRouterPricing["overrides"]): "paid" | "unverified" | null {
  if (overrides == null) return null;
  if (!Array.isArray(overrides)) return "unverified";
  if (overrides.length === 0) return null;

  for (const tier of overrides) {
    if (!(tier instanceof Object) || Array.isArray(tier)) return "unverified";
    for (const [key, value] of Object.entries(tier)) {
      // Threshold fields (min_prompt_tokens, …) describe when a tier applies.
      if (key.startsWith("min_") || key.startsWith("max_")) continue;
      const rate = parseRate(value);
      if (Number.isNaN(rate) || rate < 0) return "unverified";
      if (rate > 0) return "paid";
    }
  }
  return null;
}

// Conservative pricing classification. A model is only "free" when every charge
// any source reports is zero and nothing (description, models.dev cost, tiered
// overrides) hints at a charge. Missing, negative (variable/router) or
// unparsable token prices are "unverified", never free.
export function assessPricing(model: OpenRouterModel): PricingAssessment {
  const pricing = model.pricing ?? {};
  const paid: string[] = [];
  const unverified: string[] = [];
  if (model.orcaReportsCharge) unverified.push("ORCA reports a non-zero charge");

  for (const key of ["prompt", "completion"] as const) {
    const raw = pricing[key];
    const rate = parseRate(raw);
    if (raw == null || Number.isNaN(rate)) {
      unverified.push(`${labelFor(key)} price not reported`);
    } else if (rate < 0) {
      unverified.push(`${labelFor(key)} price is variable`);
    } else if (rate > 0) {
      paid.push(`${labelFor(key)} tokens are charged`);
    }
  }

  for (const [key, raw] of Object.entries(pricing)) {
    if (NON_CHARGE_KEYS.has(key) || raw == null) continue;
    const rate = parseRate(raw);
    if (Number.isNaN(rate) || rate < 0) {
      unverified.push(`${labelFor(key)} price is unclear`);
    } else if (rate > 0) {
      paid.push(`${labelFor(key)} is charged separately`);
    }
  }

  const overrides = assessOverrides(pricing.overrides);
  if (overrides === "paid") paid.push("Tiered pricing applies past a usage threshold");
  if (overrides === "unverified") unverified.push("Tiered pricing could not be read");

  // Token rates alone do not price generated media. Explicit free routes
  // carry their own pricing designation; ordinary media routes need a rate.
  if (!model.id.split(":").includes("free") && paid.length === 0) {
    for (const output of model.architecture.output_modalities ?? []) {
      if (output === "text") continue;
      const rate =
        output === "audio"
          ? pricing.audio_output
          : output === "image"
            ? pricing.image_output
            : undefined;
      if (parseRate(rate) !== 0) unverified.push(`No confirmed zero rate for ${output} output`);
    }
  }

  const describedCharges = findDescribedCharges(model.description);
  if (describedCharges.length > 0) {
    unverified.push(`Description mentions a charge (${describedCharges.join(", ")})`);
  }

  const cost = model.models_dev?.cost;
  if (cost) {
    const charged = Object.entries(cost).some(([, value]) => {
      const rate = parseRate(value);
      return Number.isFinite(rate) && rate > 0;
    });
    if (charged) unverified.push("models.dev lists a non-zero cost");
  }

  if (paid.length > 0) return { status: "paid", notes: [...paid, ...unverified] };
  if (unverified.length > 0) return { status: "unverified", notes: unverified };
  return { status: "free", notes: [] };
}

export function pricingStatusLabel(status: PricingStatus): string {
  switch (status) {
    case "free":
      return "free";
    case "paid":
      return "paid";
    case "unverified":
    default:
      return "price unverified";
  }
}
