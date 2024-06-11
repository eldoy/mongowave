var connection = require('../index.js')
let db

describe('Repsert', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should create a document', async () => {
    var repsert = await db('project').repsert({ name: 'hi' }, { name: 'bye' })
    expect(repsert).not.toBe(null)
    expect(repsert.name).toEqual('bye')
    var first = await db('project').get()
    expect(first.name).toEqual('bye')
  })

  it('should update a document', async () => {
    await db('project').create({ name: 'hello' })
    var repsert = await db('project').repsert(
      { name: 'hello' },
      { name: 'bye' }
    )
    expect(repsert).not.toBe(null)
    expect(repsert.name).toEqual('bye')
    var first = await db('project').get()
    expect(first.name).toEqual('bye')
  })

  it('should update first document only', async () => {
    await db('project').create([{ name: 'hello' }, { name: 'goodbye' }])
    var repsert = await db('project').repsert(
      { name: 'hello' },
      { name: 'bye' }
    )
    expect(repsert).not.toBe(null)
    expect(repsert.name).toEqual('bye')
    var find = await db('project').find()
    expect(find[0].name).toEqual('bye')
    expect(find[1].name).toEqual('goodbye')
  })

  it('should set and unset', async () => {
    await db('project').create({ name: 'hello' })
    var repsert = await db('project').repsert(
      { name: 'hello' },
      { name: 'bye' }
    )
    expect(repsert).not.toBe(null)
    expect(repsert.name).toEqual('bye')
    var first = await db('project').get()
    expect(first.name).toEqual('bye')

    repsert = await db('project').repsert({ name: 'bye' }, { name: null })
    expect(repsert).not.toBe(null)
    expect(repsert.name).toBeUndefined()
    first = await db('project').get()
    expect(first.name).toBeUndefined()
  })

  it('should not mutate values', async () => {
    var { id } = await db('project').create({ name: 'hello' })
    expect(id).toBeDefined()
    var values = { hello: 1 }
    await db('project').repsert({ id }, values)
    expect(values).toEqual({ hello: 1 })
  })

  it('should repsert', async () => {
    var repsert = await db('project').repsert({ id: '1' }, { name: 'hello' })
    expect(repsert).not.toBe(null)
    expect(repsert.name).toBe('hello')

    var doc = await db('project').get({ id: repsert.id })
    expect(doc.name).toBe('hello')

    var repsert2 = await db('project').repsert(
      { id: repsert.id },
      { name: 'bye' }
    )
    expect(repsert2).not.toBe(null)
    expect(repsert2.name).toBe('bye')
    var doc2 = await db('project').get({ id: repsert.id })
    expect(doc2.name).toBe('bye')
  })

  it('should not save id in database', async () => {
    var create = await db('project').repsert()
    await db('project').repsert(
      { id: create.id },
      { name: 'test', _id: '1', id: '1' }
    )

    var find = await db('project').find()
    expect(find.length).toBe(1)
    expect(find[0]._id).toBeUndefined()
    expect(find[0].id).toBe(create.id)
    expect(find[0].name).toBe('test')

    var base = await db.base.collection('project').find().toArray()
    expect(base.length).toBe(1)
    expect(base[0]._id).toBe(create.id)
    expect(base[0].id).toBeUndefined()
    expect(base[0].name).toBe('test')
  })

  // alternative query
  it('no id string match, should return new document', async () => {
    await db('project').create({ id: '1' })
    var repsert = await db('project').repsert('0', { name: 'repsert' })
    expect(repsert).not.toBe(null)
    expect(repsert.name).toBe('repsert')

    var find = await db('project').find({ name: 'repsert' })
    expect(find.length).toBe(1)
  })

  it('id string match, should return updated document', async () => {
    await db('project').create({ id: '1' })
    var repsert = await db('project').repsert('1', { name: 'repsert' })
    expect(repsert).not.toBe(null)
    expect(repsert.id).toBe('1')
    expect(repsert.name).toBe('repsert')

    var find = await db('project').find()
    expect(find.length).toBe(1)
    expect(find[0].id).toBe(repsert.id)
    expect(find[0].name).toBe('repsert')
  })
})
