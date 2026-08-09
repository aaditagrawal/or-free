import type { OpenRouterModel } from "./openrouter";

export type ProviderMode = "strict" | "include_incomplete";
export type PricingFilter = "free" | "all";
export type ModeratedFilter = "all" | "true" | "false";
export type ExpiryMode = "all" | "no-expiry" | "expiring-soon";
export type SortDirection = "asc" | "desc";

export type SortKey =
  | "created"
  | "id"
  | "name"
  | "context"
  | "max_completion"
  | "expiration"
  | "prompt_price";

export type ExplorerState = {
  q: string;
  providers: string[];
  inputModalities: string[];
  outputModalities: string[];
  instructTypes: string[];
  supportedParameters: string[];
  moderated: ModeratedFilter;
  minContextLength: number | null;
  minMaxCompletionTokens: number | null;
  createdFrom: string | null;
  createdTo: string | null;
  expiryMode: ExpiryMode;
  pricingFilter: PricingFilter;
  providerMode: ProviderMode;
  sortKey: SortKey;
  sortDirection: SortDirection;
};

export type DerivedModel = {
  raw: OpenRouterModel;
  id: string;
  canonicalSlug: string;
  providerId: string | null;
  providerLogoUrl: string | null;
  name: string;
  description: string;
  createdMs: number;
  createdIso: string;
  promptPrice: number;
  completionPrice: number;
  contextLength: number | null;
  maxCompletionTokens: number | null;
  tokenizer: string;
  instructType: string | null;
  modality: string | null;
  inputModalities: string[];
  outputModalities: string[];
  family: string | null;
  knowledge: string | null;
  releaseDate: string | null;
  lastUpdated: string | null;
  attachment: boolean | null;
  reasoning: boolean | null;
  toolCall: boolean | null;
  structuredOutput: boolean | null;
  temperature: boolean | null;
  openWeights: boolean | null;
  supportedParameters: string[];
  expirationDate: string | null;
  moderated: boolean;
  isFree: boolean;
  isUnexpired: boolean;
  isProviderReady: boolean;
};
