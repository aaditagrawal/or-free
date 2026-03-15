import type { DerivedModel } from '../types/explorer'

export type OpencodeModelEntry = {
  name: string
  limit?: {
    context?: number
    output?: number
  }
}

export type OpencodeProviderConfig = {
  npm: string
  name: string
  options: {
    baseURL: string
    apiKey: string
  }
  models: Record<string, OpencodeModelEntry>
}

export type OpencodeConfig = {
  $schema: string
  model?: string
  provider: {
    openrouter: OpencodeProviderConfig
  }
}

function modelToOpencodeEntry(model: DerivedModel): OpencodeModelEntry {
  const entry: OpencodeModelEntry = {
    name: model.name,
  }

  const context = model.contextLength ?? 0
  const output = model.maxCompletionTokens ?? 0

  if (context > 0 || output > 0) {
    entry.limit = {}
    if (context > 0) entry.limit.context = context
    if (output > 0) entry.limit.output = output
  }

  return entry
}

export function generateOpencodeConfig(models: DerivedModel[]): OpencodeConfig {
  const modelEntries: Record<string, OpencodeModelEntry> = {}

  for (const model of models) {
    modelEntries[model.id] = modelToOpencodeEntry(model)
  }

  const config: OpencodeConfig = {
    $schema: 'https://opencode.ai/config.json',
    provider: {
      openrouter: {
        npm: '@ai-sdk/openai-compatible',
        name: 'OpenRouter',
        options: {
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: '{env:OPENROUTER_API_KEY}',
        },
        models: modelEntries,
      },
    },
  }

  if (models.length > 0) {
    config.model = `openrouter/${models[0].id}`
  }

  return config
}

export function formatModelConfigSnippet(model: DerivedModel): string {
  const entry = modelToOpencodeEntry(model)
  const obj = { [model.id]: entry }
  return JSON.stringify(obj, null, 2)
}

export function formatFullConfig(models: DerivedModel[]): string {
  return JSON.stringify(generateOpencodeConfig(models), null, 2)
}
