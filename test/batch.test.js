const connection = require('../index.js')
let db

let docs = []
const n = 1431
for (let i = 0; i < n; i++) {
  docs.push({ name: String(i + 1) })
}

describe('Batch', () => {
  beforeAll(async () => {
    db = await connection()
    await db.drop()
    await db('project').create(docs)
  })

  it('should batch find documents', async () => {
    let list = []
    await db('project').batch(async function (project) {
      list = list.concat(project)
    })
    expect(list.length).toBe(docs.length)
    for (let i = 0; i < n; i++) {
      expect(docs[i].name).toEqual(list[i].name)
    }
    expect(list.length).toEqual(docs.length)
  })

  it('should batch find documents with size option', async () => {
    let list = []
    await db('project').batch({}, { size: 10 }, async function (project) {
      list = list.concat(project)
    })
    expect(list.length).toBe(docs.length)
    for (let i = 0; i < n; i++) {
      expect(docs[i].name).toEqual(list[i].name)
    }
    expect(list.length).toEqual(docs.length)
  })

  it('should batch find documents limited', async () => {
    let list = [],
      limit = 10
    await db('project').batch({}, { limit }, async function (projects) {
      list = list.concat(projects)
    })
    expect(list.length).toBe(limit)
  })
})
