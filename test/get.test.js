const connection = require('../index.js')
let db

describe('Get', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should get a document', async () => {
    await db('project').create({ name: 'hello' })
    const first = await db('project').get()
    expect(first.name).toEqual('hello')
  })

  it('should do find with regexp', async () => {
    const create = await db('project').create({ name: 'hello' })
    expect(create.id).toBeDefined()
    const getRegexp = await db('project').get({ name: /ell/ })
    expect(getRegexp).not.toEqual(null)
    expect(getRegexp.name).toBe('hello')
  })

  // alternative query
  it('no id string match, should return null', async () => {
    await db('project').create({ id: '1' })
    var get = await db('project').get('0')
    expect(get).toEqual(null)
  })

  it('id string match, should return matching document', async () => {
    await db('project').create({ id: '1' })
    var get = await db('project').get('1')
    expect(get).not.toEqual(null)
    expect(get.id).toBe('1')
  })
})
