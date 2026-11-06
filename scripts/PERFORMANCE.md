# Dependency replacement benchmarks

The baseline is commit `d9f93c44201bfd94a36ef62ef4c6595631c3f8b6`, the
`chore/shadcn-lint` PR base. Install its exact dependencies outside the project;
this does not create another checkout or retain baseline runtime dependencies.

```sh
baseline_dir=$(mktemp -d /tmp/or-free-baseline.XXXXXX)
git show d9f93c44201bfd94a36ef62ef4c6595631c3f8b6:package.json > "$baseline_dir/package.json"
git show d9f93c44201bfd94a36ef62ef4c6595631c3f8b6:bun.lock > "$baseline_dir/bun.lock"
uv run --no-project python /home/mav/Code/github/aaditagrawal/dependency-freedom-shipping/fleet_gate.py \
  --project or-free build -- bun install --cwd "$baseline_dir" --frozen-lockfile --ignore-scripts
```

Use the same runtime for both sides. The project pins Bun 1.3.8 and Node
24.22.1. To run with the Bun pin without changing the system installation:

```sh
uv run --no-project python /home/mav/Code/github/aaditagrawal/dependency-freedom-shipping/fleet_gate.py \
  --project or-free build -- bunx --package bun@1.3.8 bun build scripts/classes-benchmark.ts --target=bun \
  --define 'process.env.NODE_ENV="production"' --outfile=/tmp/or-free-classes-benchmark.js
NODE_ENV=production uv run --no-project python /home/mav/Code/github/aaditagrawal/dependency-freedom-shipping/fleet_gate.py \
  --project or-free benchmark -- bunx --package bun@1.3.8 bun /tmp/or-free-classes-benchmark.js "$baseline_dir"
NODE_ENV=production uv run --no-project python /home/mav/Code/github/aaditagrawal/dependency-freedom-shipping/fleet_gate.py \
  --project or-free benchmark -- bunx --package bun@1.3.8 bun scripts/resource-benchmark.ts "$baseline_dir"
```

Prebundling the React render fixture avoids a Bun 1.3.8 CommonJS wrapper error
when directly loading the locked React server renderer. Compilation is outside
the timed region. The browser application uses React's client renderer.

For a second runtime measurement, use the same build gate to bundle with
`bun build scripts/resource-benchmark.ts --target=node --outfile=/tmp/or-free-resource-benchmark.mjs`,
then use the benchmark gate to run
`NODE_ENV=production node /tmp/or-free-resource-benchmark.mjs "$baseline_dir"`
with Node 24.22.1. The fleet-gate path is specific to the shipping environment;
elsewhere use an otherwise idle machine with no overlapping validation jobs.

Both scripts print JSON with sample counts, warmups, alternating execution order,
elapsed time, CPU time, and spread. Installation, compilation, process startup,
and network time are excluded. Fixtures are generated deterministically.

- Classes cover every conditional combination consumed by the eight call sites.
  The 20, 500, and 2,000-row React static-render fixtures assert identical HTML
  before measuring integration cost. They do not measure browser layout or paint.
- Resources compare the locked TanStack Query core against the owned store,
  including subscriptions, shared initial fetches, JSON decoding, equal and
  changed refreshes, source merging, model derivation, and teardown. Catalogs have
  20, 500, or 2,000 models. A separate SVG workload shares one request across
  100 subscribers and checks request count. Another completes pending requests
  while rows are unmounted and confirms cached results survive remounting.
  React scheduling and live network
  latency are outside this resource benchmark; hook integration tests cover the
  React behavior separately.
- The unused table package has no executed source paths. Its removal carries no
  startup, install-time, or runtime speed claim.

Measurements were taken on Linux x86_64 with an AMD Ryzen 5 5600G. Other project
agents caused substantial scheduling contention and elapsed outliers in the
preliminary runs. Final measurements require the shared fleet gate above, whose
exit 75 indicates deferral or contaminated timings, not a benchmark result. Inspect
CPU and elapsed distributions together; these fixtures provide bounded parity
evidence, not a guarantee over every browser or input.
