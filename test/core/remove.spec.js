const { clear, connection } = require('../setup.jest.js')
let $db

describe('Remove', () => {
  beforeAll(async () => $db = await connection())
  beforeEach(clear)

  it('should delete a document', async () => {
    await $db('project/insert')({ name: 'hello' })
    const remove = await $db('project/remove')({ name: 'hello' })
    expect(remove.n).toBe(1)
    const first = await $db('project/get')({ name: 'hello' })
    expect(first).toBeNull()
  })

  it('should delete multiple documents', async () => {
    await $db('project/insert')({ name: 'hello' })
    await $db('project/insert')({ name: 'hello' })
    const remove = await $db('project/remove')({ name: 'hello' })
    expect(remove.n).toBe(2)
    const find = await $db('project/find')({ name: 'hello' })
    expect(find).toEqual([])
  })
})
