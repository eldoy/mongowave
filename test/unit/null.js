const { clear, connection } = require('../setup.jest.js')
let $db

describe('Null', () => {
  beforeAll(async () => $db = await connection())
  beforeEach(async () => await clear())

  it('should not insert null', async () => {
    await $db('project').create({ name: null })
    const first = await $db('project').get()
    expect(first.name).toBeUndefined()
  })

  it('should not update with null', async () => {
    await $db('project').create({ name: 'hello' })
    let first = await $db('project').get()
    expect(first.name).toBe('hello')
    const update = await $db('project').update({ _id: first._id }, { name: null })
    first = await $db('project').get()
    expect(first.name).toBeUndefined()
  })

  it('should not return any fields with null as value', async () => {
    const projectId = (await $db.base.collection('project').insertOne({ _id: '1', name: null })).insertedId
    let project = await $db.base.collection('project').findOne({ _id: '1' })
    expect(project.name).toBeNull()
    project = await $db('project').get()
    expect(project.name).toBeUndefined()
    let projects = await $db('project').find()
    expect(projects[0].name).toBeUndefined()
  })
})
