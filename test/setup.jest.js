jest.setTimeout(10000)
const connection = require('../index.js')

const clear = async function(models = ['project'], db) {
  if (!db) {
    db = await connection()
  }
  for (const model of models) {
    const docs = await db(`${model}/find`)()
    for (const d of docs) {
      await db(`${model}/remove`)({ _id: d._id })
    }
  }
}

module.exports = { clear, connection }
