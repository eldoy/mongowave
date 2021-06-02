const connection = require('../index.js')
let db

describe('Create', () => {
  beforeAll(async () => db = await connection())
  beforeEach(async () => await db.drop())

  it('should create a document', async () => {
    const create = await db('project').create({ name: 'hello'})
    expect(create.id).toBeDefined()
    expect(create.name).toBe('hello')
    expect(typeof create.id).toEqual('string')
    expect(create.id.length).toBe(25)
  })

  it('should create multiple documents', async () => {
    const result = await db('project').create([
      { name: 'hello'}, { name: 'bye' }
    ])
    expect(result.length).toBe(2)
    expect(result[0].id).toBeDefined()
    expect(result[1].id).toBeDefined()
    expect(result[0].name).toBe('hello')
    expect(result[1].name).toBe('bye')
  })

  it('should save a date as a date object', async () => {
    const date = new Date()
    const create = await db('project').create({ date })
    expect(create.id).toBeDefined()
    const get = await db('project').get({ _id: create.id })
    expect(typeof get.date).toBe('object')
    expect(get.date.constructor === Date).toBe(true)
  })

  it('should not mutate values', async () => {
    const values = { hello: 1 }
    const create = await db('project').create(values)
    expect(create.id).toBeDefined()
    expect(values).toEqual({ hello: 1 })
  })
})
