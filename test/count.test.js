const connection = require('../index.js')
let db

describe('Count', () => {
  beforeAll(async () => (db = await connection()))
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

  // alternative query
  it('no id string match, should count 0', async () => {
    await db('project').create({ id: '1' })
    var count = await db('project').count('0')
    expect(count).toEqual(0)
  })

  it('id string match, should delete matching document', async () => {
    await db('project').create({ id: '1' })
    var count = await db('project').count('1')
    expect(count).toBe(1)
  })

  it('no id array match, should count 0', async () => {
    await db('project').create({ id: '1' })
    var count = await db('project').count(['0', '2'])
    expect(count).toBe(0)
  })

  it('id array match, should return matching documents', async () => {
    await db('project').create([{ id: '1' }, { id: '2' }])
    var count = await db('project').count(['1', '2'])
    expect(count).toBe(2)
  })
})
