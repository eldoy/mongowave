const { clear, connection } = require('../setup.jest.js')
let $db

describe('Count', () => {
  beforeAll(async () => $db = await connection())
  beforeEach(async () => await clear())

  it('should return count for existing documents', async () => {
    const insert = await $db('project').create({ name: 'hello' })
    expect(insert).toBeDefined()
    await $db('project').create({ name: 'hello' })
    let count = await $db('project').count()
    expect(count).toEqual(2)
  })
})
