const connection = require('../index.js')
let db

describe('Delete', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should delete a document', async () => {
    await db('project').create({ name: 'hello' })
    const result = await db('project').delete({ name: 'hello' })
    expect(result.n).toBe(1)
    const first = await db('project').get({ name: 'hello' })
    expect(first).toBeNull()
  })

  it('should delete multiple documents', async () => {
    await db('project').create({ name: 'hello' })
    await db('project').create({ name: 'hello' })
    const result = await db('project').delete({ name: 'hello' })
    expect(result.n).toBe(2)
    const find = await db('project').find({ name: 'hello' })
    expect(find).toEqual([])
  })

  // alternative query
  it('no id string match, should not delete', async () => {
    await db('project').create({ id: '1' })
    var result = await db('project').delete('0')
    expect(result.n).toEqual(0)
    var find = await db('project').find({ id: '1' })
    expect(find.length).toBe(1)
  })

  it('id string match, should delete matching document', async () => {
    await db('project').create({ id: '1' })
    var result = await db('project').delete('1')
    expect(result.n).toBe(1)
    var find = await db('project').find({ id: '1' })
    expect(find).toEqual([])
  })

  it('no id array match, should not delete', async () => {
    await db('project').create({ id: '1' })
    var result = await db('project').delete(['0', '2'])
    expect(result.n).toBe(0)
    var find = await db('project').find({ id: '1' })
    expect(find.length).toBe(1)
  })

  it('id array match, should return matching documents', async () => {
    await db('project').create([{ id: '1' }, { id: '2' }])
    var result = await db('project').delete(['1', '2'])
    expect(result.n).toBe(2)
    var find = await db('project').find()
    expect(find.length).toBe(0)
  })
})
