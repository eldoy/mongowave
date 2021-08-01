const connection = require('../index.js')
let db

describe('Count', () => {
  beforeAll(async () => db = await connection())
  beforeEach(async () => await db.drop())

  it('should return count for existing documents', async () => {
    const insert = await db('project').create({ name: 'hello' })
    expect(insert).toBeDefined()
    await db('project').create({ name: 'hello' })
    let count = await db('project').count()
    expect(count).toBe(2)
  })

  it('should return specific count', async () => {
    await db('project').create({ name: 'hello' })
    await db('project').create({ name: 'bye' })
    let count = await db('project').count({ name: 'bye' })
    expect(count).toBe(1)
  })

  it('should return count with limit', async () => {
    await db('project').create({ name: 'hello' })
    await db('project').create({ name: 'bye' })
    let count = await db('project').count({}, { limit: 1 })
    expect(count).toBe(1)
  })
})
