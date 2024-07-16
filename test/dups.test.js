const connection = require('../index.js')
let db

describe('Dups', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should find duplicates', async () => {
    var p1 = await db('project').create({ name: 'hello' })
    var p2 = await db('project').create({ name: 'hello' })

    const result = await db('project').dups({ fields: ['name'] })
    expect(result.length).toBe(1)
    expect(result[0].length).toBe(2)
    expect(result[0][0]).toEqual(p1.id)
    expect(result[0][1]).toEqual(p2.id)
  })
})
