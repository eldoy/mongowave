const connection = require('../index.js')
let db

describe('Create', () => {
  beforeAll(async () => db = await connection())
  beforeEach(async () => await db.drop())

  it('should create a document', async () => {
    const create = await db('project').create({ name: 'hello'})
    expect(create.id).toBeDefined()
    expect(typeof create.id).toEqual('string')
    expect(create.id.length).toBe(25)
  })

  it('should create multiple documents', async () => {
    const { n, ids } = await db('project').create([{ name: 'hello'}, { name: 'bye' }])
    expect(n).toBe(2)
    expect(Array.isArray(ids)).toBe(true)
    expect(ids.length).toEqual(2)
    expect(typeof ids[0]).toBe('string')
    expect(ids[0].length).toBe(25)
    expect(ids[1].length).toBe(25)
  })

  it('should save a date as a date object', async () => {
    const date = new Date()
    const create = await db('project').create({ date })
    expect(create.id).toBeDefined()
    const get = await db('project').get({ _id: create.id })
    expect(typeof get.date).toBe('object')
    expect(get.date.constructor === Date).toBe(true)
  })


})
