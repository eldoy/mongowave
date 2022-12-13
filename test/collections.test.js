const connection = require('../index.js')
let db

describe('Collections', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should list collections', async () => {
    await db('project').create({ name: 'a' })
    expect(typeof db.collections == 'function')
    const collections = await db.collections()
    expect(collections[0].name == 'project')
  })
})
