const { clear, connection } = require('../setup.jest.js')
let $db

describe('Update', () => {
  beforeAll(async () => $db = await connection())
  beforeEach(clear)

  it('should update a document', async () => {
    await $db('project').create({ name: 'hello' })
    const update = await $db('project').update({ name: 'hello' }, { name: 'bye' })
    expect(update.n).toBe(1)
    const first = await $db('project').get()
    expect(first.name).toEqual('bye')
  })

  it('should update multiple documents', async () => {
    await $db('project').create({ name: 'hello' })
    await $db('project').create({ name: 'hello' })
    const update = await $db('project').update({ name: 'hello' }, { name: 'bye' })
    expect(update.n).toBe(2)
    const find = await $db('project').find()
    expect(find[0].name).toEqual('bye')
    expect(find[1].name).toEqual('bye')
  })
})
