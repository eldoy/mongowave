const connection = require('../index.js')
let db

describe('Analyze', () => {
  beforeAll(async () => {
    console.info = function () {}
    db = await connection()
  })
  beforeEach(async () => await db.drop())

  it('should index collections', async () => {
    await db('project').create({ name: 'a' })
    const result = await db('project').analyze()
    expect(typeof result).toBe('object')
  })
})
