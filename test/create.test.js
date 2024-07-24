const connection = require('../index.js')
let db

describe('Create', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should create a document', async () => {
    const create = await db('project').create({ name: 'hello' })
    expect(create.id).toBeDefined()
    expect(create.name).toBe('hello')
    expect(typeof create.id).toEqual('string')
    expect(create.id.length).toBe(25)
  })

  it('should create multiple documents', async () => {
    const result = await db('project').create([
      { name: 'hello' },
      { name: 'bye' }
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

  it('should not save id in database', async () => {
    const values = { id: '1' }

    const create = await db('project').create(values)
    expect(create._id).toBeUndefined()
    expect(create.id).toBe('1')

    const find = await db('project').find()
    expect(find.length).toBe(1)
    expect(find[0]._id).toBeUndefined()
    expect(find[0].id).toBe('1')

    const base = await db.base.collection('project').find().toArray()
    expect(base.length).toBe(1)
    expect(base[0]._id).toBe('1')
    expect(base[0].id).toBeUndefined()
  })

  it('should allow number as id with stringid option', async () => {
    var db2 = await connection({ stringid: false })
    await db2('project').create({ id: 3, name: 'three' })
    var ids = await db('project').ids({ name: 'three' })
    expect(ids.length).toEqual(1)
    expect(ids[0]).toBe(3)
  })
})
