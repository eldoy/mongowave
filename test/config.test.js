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
})
