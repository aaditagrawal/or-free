// Install the committed package.json + bun.lock in a temporary directory, then run:
// bun scripts/classes-benchmark.ts /absolute/path/to/baseline-directory
// No baseline dependency is needed by the shipped application.
import { strict as assert } from 'node:assert'
import { cpus, platform, release } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server.node'
import { classes } from '../src/lib/classes.ts'

const baselineDir = process.argv[2]
if (!baselineDir) throw new Error('Pass a frozen install of the committed baseline as argument 1')
const { clsx } = await import(pathToFileURL(resolve(baselineDir, 'node_modules/clsx/dist/clsx.mjs')).href)
type ClassJoin = typeof classes
const baseline: ClassJoin = clsx
const samples = 31
const iterations = 100_000
let sink = 0

// All combinations used in the eight original call sites, including unselected
// rows, paid/incomplete rows, and active ascending/descending sort buttons.
const fixtures: Parameters<ClassJoin>[] = [
  ['nav-link', false], ['nav-link', 'nav-link-active'],
  ['chip', false], ['chip', 'chip-active'],
  ['config-model-item', false], ['config-model-item', 'config-model-active'],
  ['sort-button', false, false], ['sort-button', 'sort-active', 'sort-asc'],
  ['sort-button', 'sort-active', 'sort-desc'], [false, false],
  ['row-warning', false], [false, 'row-paid'], ['row-warning', 'row-paid'],
  ['status-pill', false], ['status-pill', 'on'],
]
for (const values of [...fixtures, ['', undefined, null], ['a', '', 'b']]) {
  assert.equal(classes(...values), baseline(...values))
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return { medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.floor(sorted.length * 0.95)], minMs: sorted[0] }
}

function benchmark(name: string, operation: (join: ClassJoin) => number) {
  for (let i = 0; i < 8; i++) { sink ^= operation(baseline); sink ^= operation(classes) }
  const before: number[] = [], after: number[] = []
  const beforeCpu: number[] = [], afterCpu: number[] = []
  for (let i = 0; i < samples; i++) {
    const order = i % 2 ? [classes, baseline] : [baseline, classes]
    for (const join of order) {
      const start = performance.now()
      const cpuStart = process.cpuUsage()
      sink ^= operation(join)
      const cpu = process.cpuUsage(cpuStart)
      const duration = performance.now() - start
      ;(join === baseline ? before : after).push(duration)
      ;(join === baseline ? beforeCpu : afterCpu).push((cpu.user + cpu.system) / 1000)
    }
  }
  console.log(JSON.stringify({ workload: name, samples, baseline: stats(before), candidate: stats(after), baselineCpu: stats(beforeCpu), candidateCpu: stats(afterCpu) }))
}

console.log(JSON.stringify({ baselineRef: 'd9f93c44201bfd94a36ef62ef4c6595631c3f8b6', runtime: process.version, bun: process.versions.bun ?? null, machine: `${platform()} ${release()} ${cpus()[0].model}`, warmups: 8, order: 'alternating', units: 'milliseconds per batch; CPU excludes descheduling; startup, compilation and installation excluded' }))
benchmark(`${iterations} calls cycling all consumed class combinations`, (join) => {
  let total = 0
  for (let i = 0; i < iterations; i++) total += join(...fixtures[i % fixtures.length]).length
  return total
})

// The resulting attributes are identical. This also measures whether class
// generation adds work inside React's table rendering rather than just timing
// isolated calls. It performs no layout, network requests or DOM mutations.
function renderRows(join: ClassJoin, count: number) {
  return renderToStaticMarkup(createElement('table', null, createElement('tbody', null,
    Array.from({ length: count }, (_, i) => createElement('tr', {
      key: i, className: join(i % 3 === 0 && 'row-warning', i % 2 === 0 && 'row-paid'),
    }, createElement('td', null, createElement('span', {
      className: join('status-pill', i % 2 === 0 && 'on'),
    }, `model-${i}`)))),
  )))
}
for (const count of [20, 500, 2000]) {
  assert.equal(renderRows(classes, count), renderRows(baseline, count))
  benchmark(`React static table with ${count} rows`, (join) => renderRows(join, count).length)
}
console.log(JSON.stringify({ sink }))
