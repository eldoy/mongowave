const connection = require('../index.js')
let db

describe('Null', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should insert null', async () => {
    timeStart = new Date()
    await db('project').create({ name: null })
    timeEnd = new Date()

    var result = await db.base.collection('project').find().toArray()
    expect(result.length).toBe(1)

    var entry = result[0]
    expect(Object.keys(entry).length).toBe(4)
    expect(typeof entry._id).toBe('string')
    expect(entry.name).toBe(null)
    expect(entry.created_at >= timeStart).toBeTruthy()
    expect(entry.created_at <= timeEnd).toBeTruthy()
    expect(
      entry.created_at.getTime() == entry.updated_at.getTime()
    ).toBeTruthy()
  })

  it('should update with null', async () => {
    await db('project').create({ name: 'hello' })

    var result = await db.base.collection('project').find().toArray()
    expect(result.length).toBe(1)

    var entry = result[0]
    expect(Object.keys(entry).length).toBe(4)
    expect(entry.name).toBe('hello')

    timeStart = new Date()
    var update = await db('project').update({ _id: entry._id }, { name: null })
    timeEnd = new Date()

    expect(update).toEqual({ n: 1 })

    result = await db.base.collection('project').find().toArray()
    expect(result.length).toBe(1)

    entry = result[0]
    expect(Object.keys(entry).length).toBe(4)
    expect(typeof entry._id).toBe('string')
    expect(entry.name).toBe(null)
    expect(entry.created_at < timeStart).toBeTruthy()
    expect(entry.updated_at >= timeStart).toBeTruthy()
    expect(entry.created_at < entry.updated_at).toBeTruthy()
  })

  it('should find documents with null field', async () => {
    await db.base.collection('project').insertOne({ _id: '1', name: null })
    await db.base.collection('project').insertOne({ _id: '2', name: undefined })
    await db.base.collection('project').insertOne({ _id: '3' })
    await db.base.collection('project').insertOne({ _id: '4', name: '' })

    var result = await db('project').find({ name: null })
    expect(result).toEqual([
      { id: '1', name: null },
      { id: '2', name: null }
    ])
  })
})
