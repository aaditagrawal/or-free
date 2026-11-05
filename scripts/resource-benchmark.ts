// Run with NODE_ENV=production bun scripts/resource-benchmark.ts <baseline-dir>.
// The baseline directory contains the committed manifest/lock installed frozen.
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import process from 'node:process'
import { createResource } from '../src/lib/resource'
import { mergeModelSources } from '../src/lib/openrouter'
import { deriveModels } from '../src/lib/models'
import type { OpenRouterModel, OpenRouterModelsResponse } from '../src/types/openrouter'

const baselineDir = process.argv[2]
if (!baselineDir) throw new Error('Pass a frozen baseline installation directory')
const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })
Object.defineProperty(globalThis, 'document', { value: doc, configurable: true })
Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true })
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
const { QueryClient, QueryObserver } = await import(pathToFileURL(resolve(baselineDir, 'node_modules/@tanstack/query-core/build/modern/index.js')).href)

function payload(count: number, changed = false): OpenRouterModelsResponse {
  return { data: Array.from({ length: count }, (_, index): OpenRouterModel => ({
    id: `provider-${index % 10}/model-${index}:free`, canonical_slug: `model-${index}`, name: `Model ${index}`,
    description: 'Model metadata '.repeat(8), created: 1_700_000_000 + index,
    pricing: { prompt: changed ? String(index + 1) : '0', completion: '0' }, context_length: 8192 + index,
    architecture: { tokenizer: 'Other', instruct_type: 'none', modality: 'text', input_modalities: ['text'], output_modalities: ['text'] },
    top_provider: { context_length: 8192, max_completion_tokens: 4096, is_moderated: false },
    supported_parameters: ['temperature', 'top_p'], default_parameters: { temperature: 0.8 },
  })) }
}

type Snapshot = { data?: OpenRouterModelsResponse }
let sink = 0
function consume() {
  let previous: OpenRouterModelsResponse | undefined
  return (snapshot: Snapshot) => {
    if (!snapshot.data || previous === snapshot.data) return
    previous = snapshot.data
    const merged = mergeModelSources(snapshot.data, undefined, undefined)
    sink += deriveModels(merged?.data ?? [], '2026-11-05').length
  }
}

async function runBaseline(json: string[], consumers: number, repeats: number) {
  const client = new QueryClient()
  client.mount()
  let next = 0
  let calls = 0
  const observers = Array.from({ length: consumers }, () => new QueryObserver(client, {
    queryKey: ['models', 'or'], queryFn: async () => { calls++; return JSON.parse(json[next % json.length]) },
    staleTime: 300_000, gcTime: 300_000, refetchInterval: 300_000, refetchOnWindowFocus: false,
  }))
  const unsubscribes = observers.map((observer: { subscribe: (fn: (value: Snapshot) => void) => () => void }) => observer.subscribe(consume()))
  await observers[0].refetch()
  for (let iteration = 0; iteration < repeats; iteration++) { next++; await observers[0].refetch() }
  if (calls !== repeats + 1) throw new Error(`Baseline dedup failed: ${calls}`)
  unsubscribes.forEach((unsubscribe: () => void) => unsubscribe())
  client.unmount()
  client.clear()
}

async function runCandidate(json: string[], consumers: number, repeats: number) {
  let next = 0
  let calls = 0
  const resource = createResource<OpenRouterModelsResponse>({
    fetch: async () => { calls++; return JSON.parse(json[next % json.length]) },
    staleTime: 300_000, gcTime: 0, interval: 300_000,
  })
  const unsubscribes = Array.from({ length: consumers }, () => {
    const onChange = consume()
    return resource.subscribe(() => onChange(resource.getSnapshot()))
  })
  await resource.refetch()
  for (let iteration = 0; iteration < repeats; iteration++) { next++; await resource.refetch() }
  if (calls !== repeats + 1) throw new Error(`Candidate dedup failed: ${calls}`)
  unsubscribes.forEach((unsubscribe) => unsubscribe())
  // Let the zero-duration collection timer run outside the measured next sample.
}

const svg = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M0 0h24v24H0z"/></svg>'
async function runLogoBaseline() {
  const client = new QueryClient()
  client.mount()
  let calls = 0
  const observers = Array.from({ length: 100 }, () => new QueryObserver(client, {
    queryKey: ['provider-logo', 'fixture.svg'], queryFn: async () => { calls++; return svg },
    staleTime: 86_400_000, gcTime: 86_400_000, retry: false,
  }))
  const stops = observers.map((observer: { subscribe: (fn: () => void) => () => void }) => observer.subscribe(() => { sink++ }))
  await observers[0].refetch()
  if (calls !== 1) throw new Error('Baseline logo sharing failed')
  stops.forEach((stop: () => void) => stop())
  client.unmount(); client.clear()
}
async function runLogoCandidate() {
  let calls = 0
  const resource = createResource({ fetch: async () => { calls++; return svg }, staleTime: 86_400_000, gcTime: 0, retries: 0, cancelOnUnused: false })
  const stops = Array.from({ length: 100 }, () => resource.subscribe(() => { sink++ }))
  await resource.refetch()
  if (calls !== 1) throw new Error('Candidate logo sharing failed')
  stops.forEach((stop) => stop())
}

// Filtering out every row must not discard an already-started logo request.
async function runLogoRemountBaseline() {
  const client = new QueryClient()
  client.mount()
  for (let index = 0; index < 30; index++) {
    let finish!: (value: string) => void
    let calls = 0
    const response = new Promise<string>((resolve) => { finish = resolve })
    const options = {
      queryKey: ['provider-logo', `fixture-${index}.svg`],
      queryFn: () => { calls++; return response },
      staleTime: 86_400_000, gcTime: 86_400_000, retry: false,
    }
    const first = new QueryObserver(client, options)
    const leave = first.subscribe(() => { sink++ })
    const pending = first.refetch()
    leave()
    finish(svg)
    await pending
    const second = new QueryObserver(client, options)
    const leaveAgain = second.subscribe(() => { sink++ })
    if (calls !== 1 || second.getCurrentResult().data !== svg) throw new Error('Baseline discarded an unused logo')
    leaveAgain()
  }
  client.unmount(); client.clear()
}

async function runLogoRemountCandidate() {
  for (let index = 0; index < 30; index++) {
    let finish!: (value: string) => void
    let calls = 0
    const response = new Promise<string>((resolve) => { finish = resolve })
    const resource = createResource({
      fetch: () => { calls++; return response },
      staleTime: 86_400_000, gcTime: 0, retries: 0, cancelOnUnused: false,
    })
    const leave = resource.subscribe(() => { sink++ })
    const pending = resource.refetch()
    leave()
    finish(svg)
    await pending
    const leaveAgain = resource.subscribe(() => { sink++ })
    if (calls !== 1 || resource.getData() !== svg) throw new Error('Candidate discarded an unused logo')
    leaveAgain()
  }
}

function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return { median: sorted[Math.floor(sorted.length / 2)], min: sorted[0], max: sorted.at(-1) }
}
async function measure(run: () => Promise<void>) {
  const cpu = process.cpuUsage()
  const start = performance.now()
  await run()
  const wallMs = performance.now() - start
  const used = process.cpuUsage(cpu)
  return { wallMs, cpuMs: (used.user + used.system) / 1000 }
}

const results = []
for (const [name, count, consumers, changed, repeats] of [
  ['small/equal', 20, 1, false, 20], ['typical/equal', 500, 3, false, 10],
  ['large/equal', 2000, 3, false, 5], ['large/changed', 2000, 3, true, 5],
  ['shared-model-fanout', 1, 100, false, 20],
  ['primitive-svg-100-subscribers', 0, 100, false, 0],
  ['pending-svg-unmount-remount-30', 0, 1, false, 0],
] as const) {
  const json = changed ? [JSON.stringify(payload(count)), JSON.stringify(payload(count, true))] : [JSON.stringify(payload(count))]
  const remount = name === 'pending-svg-unmount-remount-30'
  const baseline = remount ? runLogoRemountBaseline : count ? () => runBaseline(json, consumers, repeats) : runLogoBaseline
  const candidate = remount ? runLogoRemountCandidate : count ? () => runCandidate(json, consumers, repeats) : runLogoCandidate
  await baseline(); await candidate()
  const samples = { baseline: [] as Awaited<ReturnType<typeof measure>>[], candidate: [] as Awaited<ReturnType<typeof measure>>[] }
  for (let i = 0; i < 9; i++) {
    for (const key of i % 2 ? ['candidate', 'baseline'] as const : ['baseline', 'candidate'] as const) {
      samples[key].push(await measure(key === 'baseline' ? baseline : candidate))
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
  results.push({ name, count, consumers, refreshes: repeats, baseline: { wallMs: summary(samples.baseline.map((s) => s.wallMs)), cpuMs: summary(samples.baseline.map((s) => s.cpuMs)) }, candidate: { wallMs: summary(samples.candidate.map((s) => s.wallMs)), cpuMs: summary(samples.candidate.map((s) => s.cpuMs)) } })
}
console.log(JSON.stringify({ runtime: process.versions, environment: process.env.NODE_ENV, samples: 9, warmups: 1, order: 'alternating', includes: 'resource creation, subscriptions, shared initial fetch, JSON decoding, repeated refresh/equality, progressive merge + derive when data changes, unsubscribe/cleanup; no network or compile time', results, sink }, null, 2))
