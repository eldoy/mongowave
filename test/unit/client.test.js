const { clear, connection } = require('../setup.jest.js')
let $db

describe('Client', () => {
  beforeAll(async () => $db = await connection())
  beforeEach(async () => await clear())

  it('should return the count via the raw client', async () => {
    const insert = await $db('project').create({ name: 'hello' })
    expect(insert).toBeDefined()
    const project = await $db.client.db('wdb').collection('project').findOne({ _id: insert._id })
    expect(project._id).toEqual(insert._id)
  })

  it('should return the count via the client base collection', async () => {
    const insert = await $db('project').create({ name: 'hello' })
    expect(insert).toBeDefined()
    const project = await $db.base.collection('project').findOne({ _id: insert._id })
    expect(project._id).toEqual(insert._id)
  })
})
