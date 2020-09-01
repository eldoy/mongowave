const { clear, connection } = require('../setup.jest.js')
let $db

describe('Get', () => {
  beforeAll(async () => $db = await connection({ timestamps: true }))
  beforeEach(async () => await clear())

  it('should add timestamps on create', async () => {
    await $db('project').create({ name: 'hello' })
    const first = await $db('project').get()
    expect(first.created_at).toBeDefined()
    expect(first.created_at instanceof Date).toBe(true)
    expect(first.updated_at).toBeDefined()
    expect(first.updated_at instanceof Date).toBe(true)
    expect(first.created_at.toString()).toEqual(first.updated_at.toString())
  })

  it('should update timestamps on update', async () => {
    await $db('project').create({ name: 'hello' })
    let first = await $db('project').get()
    let update = await $db('project').update({ name: 'hello'}, { name: 'bye' })
    expect(update.n).toBe(1)
    first = await $db('project').get()
    expect(first.created_at < first.updated_at).toBe(true)
  })
})
