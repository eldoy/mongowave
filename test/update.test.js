const connection = require('../index.js')
let db

describe('Update', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should update a document', async () => {
    await db('project').create({ name: 'hello' })
    const update = await db('project').update(
      { name: 'hello' },
      { name: 'bye' }
    )
    expect(update.n).toBe(1)
    const first = await db('project').get()
    expect(first.name).toEqual('bye')
  })

  it('should not update a document without values', async () => {
    await db('project').create({ name: 'hello' })
    let update = await db('project').update({ name: 'hello' })
    expect(update.n).toBe(0)
    let first = await db('project').get()
    expect(first.name).toEqual('hello')
    update = await db('project').update(
      { name: 'hello' },
      { name: undefined, bye: 'bye' }
    )
    expect(update.n).toBe(1)
    first = await db('project').get()
    expect(first.name).toBeUndefined()
    expect(first.bye).toBe('bye')
  })

  it('should update multiple documents', async () => {
    await db('project').create({ name: 'hello' })
    await db('project').create({ name: 'hello' })
    const update = await db('project').update(
      { name: 'hello' },
      { name: 'bye' }
    )
    expect(update.n).toBe(2)
    const find = await db('project').find()
    expect(find[0].name).toEqual('bye')
    expect(find[1].name).toEqual('bye')
  })

  it('should set and unset', async () => {
    await db('project').create({ name: 'hello' })
    let update = await db('project').update({ name: 'hello' }, { name: 'bye' })
    expect(update.n).toBe(1)
    let first = await db('project').get()
    expect(first.name).toEqual('bye')

    update = await db('project').update({ name: 'bye' }, { name: undefined })
    expect(update.n).toBe(1)
    first = await db('project').get()
    expect(first.name).toBeUndefined()
  })

  it('should use db field update operators', async () => {
    await db('project').create({ name: 'hello' })
    let update = await db('project').update(
      { name: 'hello' },
      { $inc: { counter: 1 } }
    )
    expect(update.n).toBe(1)
    let first = await db('project').get()
    expect(first.counter).toEqual(1)
  })

  it('should not mutate values', async () => {
    const { id } = await db('project').create({ name: 'hello' })
    expect(id).toBeDefined()
    const values = { hello: 1 }
    await db('project').update({ id }, values)
    expect(values).toEqual({ hello: 1 })
  })

  it('should upsert', async () => {
    const update = await db('project').update(
      { id: '1' },
      { name: 'hello' },
      { upsert: true }
    )
    expect(update.n).toBe(0)
    const doc = await db('project').get({ id: '1' })
    expect(doc.name).toBe('hello')

    const update2 = await db('project').update(
      { id: '1' },
      { name: 'bye' },
      { upsert: true }
    )
    expect(update2.n).toBe(1)

    const doc2 = await db('project').get({ id: '1' })
    expect(doc2.name).toBe('bye')
  })

  it('should not save id in database', async () => {
    var values = { id: '1' }

    var create = await db('project').create(values)
    expect(create._id).toBeUndefined()
    expect(create.id).toBe('1')

    var update = await db('project').update(values, {
      name: 'test',
      _id: '1',
      id: '1'
    })
    expect(update.n).toBe(1)

    var find = await db('project').find()
    expect(find.length).toBe(1)
    expect(find[0]._id).toBeUndefined()
    expect(find[0].id).toBe('1')
    expect(find[0].name).toBe('test')

    var base = await db.base.collection('project').find().toArray()
    expect(base.length).toBe(1)
    expect(base[0]._id).toBe('1')
    expect(base[0].id).toBeUndefined()
    expect(base[0].name).toBe('test')
  })

  it('should change updated_at', async () => {
    var DATE = new Date()
    var values = { id: '1' }

    await db('project').create(values)
    await db('project').update(values, { updated_at: DATE, name: 'test' })

    var find = await db('project').find()
    expect(find.length).toBe(1)

    var entry = find[0]
    expect(typeof entry.created_at.getTime).toBe('function')
    expect(typeof entry.updated_at.getTime).toBe('function')
    expect(entry.created_at.getTime()).toBeLessThan(entry.updated_at.getTime())
    expect(entry.updated_at.getTime()).not.toEqual(DATE.getTime())
    expect(entry.updated_at.getTime()).toBeGreaterThan(DATE.getTime())
  })

  // alternative query
  it('no id string match, should return an empty array', async () => {
    await db('project').create({ id: '1' })
    var update = await db('project').update('0', { name: 'update' })
    expect(update.n).toBe(0)

    var find = await db('project').find({ name: 'update' })
    expect(find.length).toBe(0)
  })

  it('id string match, should return matching document', async () => {
    await db('project').create({ id: '1' })
    var update = await db('project').update('1', { name: 'update' })
    expect(update.n).toBe(1)

    var find = await db('project').find({ name: 'update' })
    expect(find.length).toBe(1)
    expect(find[0].id).toBe('1')
    expect(find[0].name).toBe('update')
  })

  it('no id array match, should return an empty array', async () => {
    await db('project').create({ id: '1' })
    var update = await db('project').update(['0', '2'], { name: 'update' })
    expect(update.n).toBe(0)

    var find = await db('project').find({ name: 'update' })
    expect(find.length).toBe(0)
  })

  it('id array match, should return matching documents', async () => {
    await db('project').create([{ id: '1' }, { id: '2' }])
    var update = await db('project').update(['1', '2'], { name: 'update' })
    expect(update.n).toBe(2)

    var find = await db('project').find({ name: 'update' })
    expect(find.length).toBe(2)
    expect(find[0].id).toBe('1')
    expect(find[0].name).toBe('update')
    expect(find[1].id).toBe('2')
    expect(find[1].name).toBe('update')
  })

  it('should not mutate passing object', async () => {
    var project = await db('project').create({ id: '1' })
    await db('project').update({ id: project.id }, project)
    expect(project.id).toBe('1')
  })
})
