const connection = require('../index.js')
let db

describe('Index', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should index collections', async () => {
    expect(typeof db.index == 'function')
  })
})
