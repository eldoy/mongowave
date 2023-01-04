const connection = require('../index.js')
let db

describe('Set', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should create a document', async () => {
    const create = await db('project').set({ name: 'hello' })
    expect(create.id).toBeDefined()
    expect(create.name).toBe('hello')
    expect(typeof create.id).toEqual('string')
    expect(create.id.length).toBe(25)
  })

  it('should create multiple documents', async () => {
    const result = await db('project').set([{ name: 'hello' }, { name: 'bye' }])
    expect(result.length).toBe(2)
    expect(result[0].id).toBeDefined()
    expect(result[1].id).toBeDefined()
    expect(result[0].name).toBe('hello')
    expect(result[1].name).toBe('bye')
  })

  it('should update a document', async () => {
    await db('project').create({ name: 'hello' })
    const update = await db('project').set({ name: 'hello' }, { name: 'bye' })
    expect(update.n).toBe(1)
    const first = await db('project').get()
    expect(first.name).toEqual('bye')
  })

  it('should update multiple documents', async () => {
    await db('project').create({ name: 'hello' })
    await db('project').create({ name: 'hello' })
    const update = await db('project').set({ name: 'hello' }, { name: 'bye' })
    expect(update.n).toBe(2)
    const find = await db('project').find()
    expect(find[0].name).toEqual('bye')
    expect(find[1].name).toEqual('bye')
  })

  it('should delete a document', async () => {
    await db('project').create({ name: 'hello' })
    const result = await db('project').set({ name: 'hello' }, null)
    expect(result.n).toBe(1)
    const first = await db('project').get({ name: 'hello' })
    expect(first).toBeNull()
  })

  it('should delete multiple documents', async () => {
    await db('project').create({ name: 'hello' })
    await db('project').create({ name: 'hello' })
    const result = await db('project').set({ name: 'hello' }, null)
    expect(result.n).toBe(2)
    const find = await db('project').find({ name: 'hello' })
    expect(find).toEqual([])
  })
})
