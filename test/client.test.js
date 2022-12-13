const connection = require('../index.js')
let db

describe('Client', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should return the count via the raw client', async () => {
    const create = await db('project').create({ name: 'hello' })
    expect(create).toBeDefined()
    const project = await db.client
      .db('wdb')
      .collection('project')
      .findOne({ _id: create.id })
    expect(project._id).toEqual(create.id)
  })

  it('should return the count via the client base collection', async () => {
    const create = await db('project').create({ name: 'hello' })
    expect(create).toBeDefined()
    const project = await db.base
      .collection('project')
      .findOne({ _id: create.id })
    expect(project._id).toEqual(create.id)
  })

  it('should expose the ObjectId function', async () => {
    expect(typeof db.id).toBe('function')
  })
})
