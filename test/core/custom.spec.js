const { clear, connection } = require('../setup.jest.js')
let $db

describe('Custom', () => {
  beforeAll(async () => $db = await connection())
  beforeEach(clear)

  it('should not be able to call a custom function', async () => {
    try {
      await $db('project/custom')({ name: 'hello' })
    } catch (e) {
      expect(e.message).toBe('command not supported')
    }
  })
})
