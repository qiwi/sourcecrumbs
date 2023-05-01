import  { expect } from 'earljs'
import { test } from 'uvu'

import {fetchCommit, fetchPkg, verifyPkg} from '../../main/ts/sourcecrumbs'

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
    commit: 'b4f56f4ce75460c670363457821c054ed4db8464'
  })).toBeA(String)
})

test.run()
