import assert from 'node:assert'
import { test } from "uvu"

import { verify } from '../../../target/es6'

test('index (es6)', () => {
  assert.equal(typeof verify, 'function')
})

test.run()
