const connection = require('../index.js')
let db

describe('Deindex', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should deindex collections', async () => {
    expect(typeof db.index == 'function')
  })
})
