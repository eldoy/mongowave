const connection = require('../index.js')
let db

// Not in use:
// jest.setTimeout(90 * 1000)

let docs = []
const n = 1431
for (let i = 0; i < n; i++) {
  docs.push({ name: String(i + 1) })
}

describe('Search', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should batch find documents', async () => {
    await db('project').create(docs)
    let list = []
    await db('project').search(async function (projects) {
      list = list.concat(projects)
    })
    expect(list.length).toBe(docs.length)
    for (let i = 0; i < n; i++) {
      expect(docs[i].name).toEqual(list[i].name)
    }
    expect(list.length).toEqual(docs.length)
  })
})
