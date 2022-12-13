const connection = require('../index.js')
let db

describe('Config', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should allow custom id function', async () => {
    db = await connection({
      id: function () {
        return '1'
      }
    })
    const create = await db('project').create({ name: 'hello' })
    expect(create.id).toEqual('1')
  })

  it('should disable custom id generation', async () => {
    db = await connection({
      id: false,
      simpleid: false
    })
    const create = await db('project').create({ name: 'hello' })
    expect(create._id).toBeDefined()
    expect(typeof create._id).toBe('object')
  })

  it('should allow optional flip id', async () => {
    db = await connection({ simpleid: false })
    const create = await db('project').create({ name: 'hello' })
    expect(create.id).toBeUndefined()
    expect(create._id).toBeDefined()
  })
})
