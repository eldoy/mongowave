const connection = require('../index.js')
let db

describe('Aggregate', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should find documents using aggregate', async () => {
    await db('project').create({ name: 'hello' })
    const find = await db('project').aggregate()
    expect(find.length).toEqual(1)
    expect(find[0].name).toEqual('hello')
  })
})
