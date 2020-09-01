const { clear, connection } = require('../setup.jest.js')
let $db

describe('FakeID', () => {
  beforeAll(async () => $db = await connection({ fakeid: true }))
  beforeEach(async () => await clear())

  it('should create with id and not _id - automatic', async () => {
    const create = await $db('project').create({ name: 'hello' })
    expect(create.id).toBeDefined()
    expect(create._id).toBeUndefined()
    const first = await $db('project').get()
    expect(first.id).toBeDefined()
    expect(first._id).toBeUndefined()
  })

  it('should create with id and not _id - manual', async () => {
    let create = await $db('project').create({ name: 'hello', id: '1' })
    expect(create.id).toEqual('1')
    expect(create._id).toBeUndefined()
    create = await $db('project').create({ name: 'hello', _id: '2' })
    expect(create.id).toEqual('2')
    expect(create._id).toBeUndefined()
  })

  it('should update with id and not _id', async () => {
    const create = await $db('project').create({ name: 'hello' })
    expect(create.id).toBeDefined()
    const update = await $db('project').update({ id: create.id }, { name: '1' })
    expect(update.n).toEqual(1)
    let first = await $db('project').get({ id: create.id })
    expect(first.name).toBe('1')
    expect(first.id).toBeDefined()
    expect(first._id).toBeUndefined()
    let all = await $db('project').find({ id: create.id })
    expect(all[0].name).toBe('1')
    expect(all[0].id).toBeDefined()
    expect(all[0]._id).toBeUndefined()
  })

  it('should delete with id and not _id', async () => {
    const create = await $db('project').create({ name: 'hello' })
    expect(create.id).toBeDefined()
    const del = await $db('project').delete({ id: create.id })
    expect(del.n).toEqual(1)
    let first = await $db('project').get({ id: create.id })
    expect(first).toBe(null)
  })

  it('should count with id and _id', async () => {
    const create = await $db('project').create({ name: 'hello' })
    expect(create.id).toBeDefined()
    const count = await $db('project').count({ id: create.id })
    expect(count).toEqual(1)
  })
})
