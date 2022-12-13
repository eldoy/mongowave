const connection = require('../index.js')
let db

const docs = [{ name: 'a' }, { name: 'b' }, { name: 'c' }]

describe('Each', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should find each document', async () => {
    await db('project').create(docs)
    let list = []
    await db('project').each(async function (project) {
      list.push(project)
    })
    expect(list[0].name).toBe('a')
    expect(list[1].name).toBe('b')
    expect(list[2].name).toBe('c')
  })
})
