const connection = require('../index.js')
let db

let docs = []
const n = 10
for (let i = 0; i < n; i++) {
  docs.push({ name: String(i + 1) })
}

describe('Last', () => {
  beforeAll(async () => {
    db = await connection()
    await db.drop()
    await db('project').create({ name: 'first' })
    await db('project').create(docs)
    await db('project').create({ name: 'last' })
  })

  it('should find last created document', async () => {
    var last = await db('project').last()
    expect(last.name).toBe('last')
  })
})
