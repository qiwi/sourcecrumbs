import { expect } from 'earljs'
import { test } from 'uvu'

import { fetchSources, fetchPkg, verifyPkg, fetchPackument, fetchAttestation } from '../../main/ts/sourcecrumbs'

const pkgRef = {name: 'toposource', version: '1.1.4', registry: 'https://registry.npmjs.org'}

test('verifyPkg ', async () => {
  expect(await verifyPkg(pkgRef)).toEqual({
    entries: {
      LICENSE: {
        source: {
          sources: [
            'LICENSE'
          ],
          coherence: 100
        },
        sourcemap: null
      },
      'README.md': {
        source: {
          sources: [
            'README.md'
          ],
          coherence: 100
        },
        sourcemap: null
      },
      'package.json': {
        source: {
          sources: [
            'package.json'
          ],
          coherence: 100
        },
        sourcemap: null
      },
      'target/cjs/index.js': {
        source: null,
        sourcemap: {
          sources: [
            'src/main/ts/index.ts',
            'src/main/ts/toposource.ts'
          ],
          valid: true,
          coherence: null
        }
      },
      'target/cjs/index.js.map': {
        source: null,
        sourcemap: null
      },
      'target/dts/index.d.ts': {
        source: null,
        sourcemap: null
      },
      'target/dts/interface.d.ts': {
        source: null,
        sourcemap: null
      },
      'target/dts/toposource.d.ts': {
        source: null,
        sourcemap: null
      },
      'target/esm/index.js.map': {
        source: null,
        sourcemap: null
      },
      'target/esm/index.mjs': {
        source: null,
        sourcemap: null
      }
    }
  })
})

test('fetchPkg', async () => {
  const targets = await fetchPkg(pkgRef)
  expect(Object.keys(targets).sort()).toEqual([
    'LICENSE',
    'README.md',
    'package.json',
    'target/cjs/index.js',
    'target/cjs/index.js.map',
    'target/dts/index.d.ts',
    'target/dts/interface.d.ts',
    'target/dts/toposource.d.ts',
    'target/esm/index.js.map',
    'target/esm/index.mjs',
  ])
})

test('fetchSources', async () => {
  const sources = await fetchSources({
    type: 'git',
    url: 'git+https://github.com/semrel-extra/toposource.git',
    hash: 'e9beae36161a8d44ffa072c2a58321d50af87919'
  })
  expect(Object.keys(sources).sort()).toEqual([
    'CHANGELOG.md',
    'LICENSE',
    'README.md',
    'package.json',
    'renovate.json',
    'src/docs/img/dense-square.svg',
    'src/docs/img/one-component-with-complex-loop.svg',
    'src/docs/img/one-component-with-loop.svg',
    'src/docs/img/one-component.svg',
    'src/docs/img/two-component-with-loop.svg',
    'src/docs/img/two-component.svg',
    'src/main/ts/index.ts',
    'src/main/ts/interface.ts',
    'src/main/ts/toposource.ts',
    'src/main/typedoc/typedoc.json',
    'src/scripts/build.cjs',
    'src/test/bench/index.mjs',
    'src/test/js/index.cjs',
    'src/test/js/index.mjs',
    'src/test/ts/index.ts',
    'src/test/ts/toposource.ts',
    'tsconfig.json',
    'yarn.lock',
  ])
})

test('fetchPackument', async() => {
  expect(await fetchPackument(pkgRef)).toEqual(expect.objectWith({
    name: 'toposource',
    gitHead: 'e9beae36161a8d44ffa072c2a58321d50af87919'
  }))
})

test('fetchAttestation', async () => {
  expect(await fetchAttestation({name: 'toposource', version: '1.1.4', registry: 'https://registry.npmjs.org'})).toEqual({
    attestations: [
      expect.objectWith({
        predicateType: 'https://slsa.dev/provenance/v0.2'
      }),
      expect.objectWith({
        predicateType: 'https://github.com/npm/attestation/tree/main/specs/publish/v0.1'
      })
    ]
  })
})

test.run()
