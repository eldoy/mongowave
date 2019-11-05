const { clear, connection } = require('../setup.jest.js')
let $db

describe('Create', () => {
  beforeAll(async () => $db = await connection())
  beforeEach(clear)

  // Test that we can create a document
  it('should insert a document', async () => {
    const insert = await $db('project').create({ name: 'hello'})
    expect(insert._id).toBeDefined()
    expect(typeof insert._id).toEqual('string')
    expect(insert._id.length).toBe(25)
  })

  // Test that date is saved as a date object
  it('should save a date as a date object', async () => {
    const date = new Date()
    const insert = await $db('project').create({ date })
    expect(insert._id).toBeDefined()
    const get = await $db('project').get({ _id: insert._id })
    expect(typeof get.date).toBe('object')
    expect(get.date.constructor === Date).toBe(true)
  })
})
