const connection = require('../index.js')
let db

describe('Drop', () => {
  beforeAll(async () => db = await connection())
  beforeEach(async () => await db.drop())

  it('should drop the database', async () => {
    await db('project').create({ name: 'hello' })
    await db('project').create({ name: 'hello' })
    let count = await db('project').count()
    expect(count).toEqual(2)
    await db.drop()
    count = await db('project').count()
    expect(count).toEqual(0)
  })
})
