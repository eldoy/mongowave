var connection = require('../index.js')
var db

var timeStart
var timeEnd

describe('Undefined', () => {
  beforeAll(async () => (db = await connection()))
  beforeEach(async () => await db.drop())

  it('should not insert undefined', async () => {
    timeStart = new Date()
    await db('project').create({ name: undefined })
    timeEnd = new Date()

    var result = await db.base.collection('project').find().toArray()
    expect(result.length).toBe(1)

    var entry = result[0]
    expect(Object.keys(entry).length).toBe(3)
    expect(typeof entry._id).toBe('string')
    expect(entry.created_at >= timeStart).toBeTruthy()
    expect(entry.created_at <= timeEnd).toBeTruthy()
    expect(
      entry.created_at.getTime() == entry.updated_at.getTime()
    ).toBeTruthy()
  })

  it('should update with undefined', async () => {
    await db('project').create({ name: 'hello' })

    var result = await db.base.collection('project').find().toArray()
    expect(result.length).toBe(1)

    var entry = result[0]
    expect(Object.keys(entry).length).toBe(4)
    expect(entry.name).toBe('hello')

    timeStart = new Date()
    var update = await db('project').update(
      { _id: entry._id },
      { name: undefined }
    )
    timeEnd = new Date()

    expect(update).toEqual({ n: 1 })

    result = await db.base.collection('project').find().toArray()
    expect(result.length).toBe(1)

    entry = result[0]
    expect(Object.keys(entry).length).toBe(3)
    expect(typeof entry._id).toBe('string')
    expect(entry.created_at < timeStart).toBeTruthy()
    expect(entry.created_at < entry.updated_at).toBeTruthy()
  })

  it('should find documents with undefined field', async () => {
    await db.base.collection('project').insertOne({ _id: '1', name: null })
    await db.base.collection('project').insertOne({ _id: '2', name: undefined })
    await db.base.collection('project').insertOne({ _id: '3' })
    await db.base.collection('project').insertOne({ _id: '4', name: '' })

    var result = await db('project').find({ name: undefined })
    expect(result).toEqual([{ id: '3' }])
  })
})
