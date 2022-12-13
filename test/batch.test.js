const connection = require('../index.js')
let db

const docs = [{ name: 'a' }, { name: 'b' }, { name: 'c' }]

describe('Batch', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should batch find documents', async () => {
    await db('project').create(docs)
    let list = []
    await db('project').batch({}, {}, async function (projects) {
      list = list.concat(projects)
    })
    expect(list[0].name).toBe('a')
    expect(list[1].name).toBe('b')
    expect(list[2].name).toBe('c')
  })
})
