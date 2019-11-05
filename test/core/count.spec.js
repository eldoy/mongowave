const { clear, connection } = require('../setup.jest.js')
let $db

describe('Count', () => {
  beforeAll(async () => $db = await connection())
  beforeEach(clear)

  it('should return count for existing documents', async () => {
    const insert = await $db('project/insert')({ name: 'hello' })
    expect(insert).toBeDefined()
    await $db('project/insert')({ name: 'hello' })
    let count = await $db('project/count')()
    expect(count).toEqual(2)
  })
})
