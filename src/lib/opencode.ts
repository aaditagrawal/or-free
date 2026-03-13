import type { DerivedModel } from '../types/explorer'

export type OpencodeModelConfig = {
  name: string
  tool_call: boolean
  temperature: boolean
  limit: {
    context: number
    output: number
  }
}

export type OpencodeConfig = {
  $schema: string
  disabled_providers: string[]
  provider: {
    openrouter: {
      name: string
      npm: string
      env: string[]
    }
  }
  models: Record<string, OpencodeModelConfig>
}

export function modelToOpencodeEntry(model: DerivedModel): OpencodeModelConfig {
  const hasToolCall = model.supportedParameters.some(
    (p) => p === 'tools' || p === 'tool_choice',
  )
  const hasTemperature = model.supportedParameters.includes('temperature')

  return {
    name: model.name,
    tool_call: hasToolCall,
    temperature: hasTemperature,
    limit: {
      context: model.contextLength ?? 0,
      output: model.maxCompletionTokens ?? 0,
    },
  }
}

export function generateOpencodeConfig(models: DerivedModel[]): OpencodeConfig {
  const entries: Record<string, OpencodeModelConfig> = {}

  for (const model of models) {
    entries[model.id] = modelToOpencodeEntry(model)
  }

  return {
    $schema: 'https://opencode.ai/config.json',
    disabled_providers: [],
    provider: {
      openrouter: {
        name: 'OpenRouter',
        npm: '@ai-sdk/openai-compatible',
        env: ['OPENROUTER_API_KEY'],
      },
    },
    models: entries,
  }
}

export function formatModelConfigSnippet(model: DerivedModel): string {
  const entry = modelToOpencodeEntry(model)
  const obj = { [model.id]: entry }
  return JSON.stringify(obj, null, 2)
}

export function formatFullConfig(models: DerivedModel[]): string {
  return JSON.stringify(generateOpencodeConfig(models), null, 2)
}

/**
 * OpenCode config schema explanation for new users:
 *
 * $schema        - Points to the JSON schema for validation/autocomplete
 * disabled_providers - Array of provider IDs to skip (empty = all enabled)
 * provider       - Provider definitions, each with:
 *   name         - Display name
 *   npm          - The npm package that implements the AI SDK provider
 *   env          - Environment variable names for API keys
 * models         - Model entries keyed by provider-prefixed model ID:
 *   name         - Human-readable model name
 *   tool_call    - Whether the model supports function/tool calling
 *   temperature  - Whether the model supports temperature parameter
 *   limit.context - Max input context window in tokens
 *   limit.output  - Max output/completion tokens
 */
