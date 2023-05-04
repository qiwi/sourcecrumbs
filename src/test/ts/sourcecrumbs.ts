import  { expect } from 'earljs'
import { test } from 'uvu'

import {fetchCommit, fetchPkg, verifyPkg, fetchPackument, fetchProvenance} from '../../main/ts/sourcecrumbs'

// test('verifyPkg ', async () => {
//   expect(await verifyPkg({name: 'toposource', version: '1.1.4'})).toEqual({
//
//   })
// })

test('verifySourcemap', async () => {
  //  curl https://registry.npmjs.com/toposource > src/test/fixtures/toposource-packument.json
  //
})

test('fetchPkg', async () => {
  expect(await fetchPkg({name: 'toposource', version: '1.1.4'})).toBeA(String)
})

test('fetchCommit', async () => {
  expect(await fetchCommit({
    repo: 'git@github.com:semrel-extra/toposource.git',
    commit: 'e9beae36161a8d44ffa072c2a58321d50af87919'
  })).toBeA(String)
})

test('fetchPackument', async() => {
  expect(await fetchPackument({name: 'toposource', version: '1.1.4', registry: 'https://registry.npmjs.org'})).toEqual(expect.objectWith({
    name: 'toposource',
    gitHead: 'e9beae36161a8d44ffa072c2a58321d50af87919'
  }))
})

test('fetchProvenance', async () => {
  expect(await fetchProvenance({name: 'toposource', version: '1.1.4', registry: 'https://registry.npmjs.org'})).toEqual({
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
