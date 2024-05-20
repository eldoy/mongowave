const connection = require('../index.js')
let db

let docs = []
const n = 10
for (let i = 0; i < n; i++) {
  docs.push({ name: String(i + 1) })
}

describe('First', () => {
  beforeAll(async () => {
    db = await connection()
    await db.drop()
    await db('project').create({ name: 'first' })
    await db('project').create(docs)
    await db('project').create({ name: 'last' })
  })

  it('should find first created document', async () => {
    var first = await db('project').first()
    expect(first.name).toBe('first')
  })
})
