const connection = require('../index.js')
let db

describe('Timestamps', () => {
  describe('enabled', () => {
    beforeEach(async () => {
      db = await connection()
      await db.drop()
    })

    it('should add timestamps on create', async () => {
      await db('project').create({ name: 'hello' })
      const first = await db('project').get()
      expect(first.created_at).toBeDefined()
      expect(first.created_at instanceof Date).toBe(true)
      expect(first.updated_at).toBeDefined()
      expect(first.updated_at instanceof Date).toBe(true)
      expect(first.created_at.toString()).toEqual(first.updated_at.toString())
    })

    it('should update timestamps on update', async () => {
      await db('project').create({ name: 'hello' })
      let first = await db('project').get()
      await new Promise(r => setTimeout(r, 100))
      let update = await db('project').update({ name: 'hello'}, { name: 'bye' })
      expect(update.n).toBe(1)
      first = await db('project').get()
      expect(first.created_at < first.updated_at).toBe(true)
    })
  })

  describe('disabled', () => {
    beforeEach(async () => {
      db = await connection({ timestamps: false })
      await db.drop()
    })

    it('should not add timestamps on create', async () => {
      await db('project').create({ name: 'hello' })
      const first = await db('project').get()
      expect(first.created_at).toBeUndefined()
      expect(first.updated_at).toBeUndefined()
    })

    it('should not update timestamps on update', async () => {
      await db('project').create({ name: 'hello' })
      let first = await db('project').get()
      expect(first.created_at).toBeUndefined()
      expect(first.updated_at).toBeUndefined()
      let update = await db('project').update({ name: 'hello'}, { name: 'bye' })
      expect(update.n).toBe(1)
      first = await db('project').get()
      expect(update.created_at).toBeUndefined()
      expect(update.updated_at).toBeUndefined()
    })
  })
})
