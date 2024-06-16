const connection = require('../index.js')
let db

describe('First', () => {
  beforeAll(async () => {
    db = await connection()
    await db.drop()
    await db('project').create({ id: '1', name: 'one' })
    await db('project').create({ id: '2', name: 'two' })
  })

  it('should return the ids', async () => {
    var ids = await db('project').ids()
    expect(ids.length).toEqual(2)
    expect(ids[0]).toBe('1')
    expect(ids[1]).toBe('2')
  })

  it('should return the ids', async () => {
    var ids = await db('project').ids({ name: 'two' })
    expect(ids.length).toEqual(1)
    expect(ids[0]).toBe('2')
  })
})
