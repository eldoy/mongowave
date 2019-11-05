const { clear, connection } = require('../setup.jest.js')
let $db

describe('Get', () => {
  beforeAll(async () => $db = await connection())
  beforeEach(clear)

  // Test that we can get a document
  it('should get a document', async () => {
    await $db('project').create({ name: 'hello' })
    const first = await $db('project').get()
    expect(first.name).toEqual('hello')
  })

  // Test that query with regexp is working
  it('should do find with regexp', async () => {
    const insert = await $db('project').create({ name: 'hello' })
    expect(insert._id).toBeDefined()
    const getRegexp = await $db('project').get({ name: /ell/ })
    expect(getRegexp).not.toEqual(null)
    expect(getRegexp.name).toBe('hello')
  })
})
