const connection = require('../index.js')
let db

describe('Delete', () => {
  beforeAll(async () => db = await connection())
  beforeEach(async () => await db.drop())

  it('should delete a document', async () => {
    await db('project').create({ name: 'hello' })
    const result = await db('project').delete({ name: 'hello' })
    expect(result.n).toBe(1)
    const first = await db('project').get({ name: 'hello' })
    expect(first).toBeNull()
  })

  it('should delete multiple documents', async () => {
    await db('project').create({ name: 'hello' })
    await db('project').create({ name: 'hello' })
    const result = await db('project').delete({ name: 'hello' })
    expect(result.n).toBe(2)
    const find = await db('project').find({ name: 'hello' })
    expect(find).toEqual([])
  })
})
