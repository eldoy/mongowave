const connection = require('../index.js')
let db

describe('Replace', () => {
  beforeAll(async () => {
    db = await connection()
    await db.drop()
    await db('project').create({
      name: 'first',
      email: 'hello@example.com'
    })
  })

  it('should replace a document', async () => {
    var result = await db('project').replace(
      { name: 'first' },
      { name: 'second' }
    )
    expect(result.n).toEqual(1)

    var last = await db('project').last()
    expect(last.name).toBe('second')
    expect(last.email).toBeUndefined()
  })
})
