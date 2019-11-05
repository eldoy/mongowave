const { MongoClient } = require('mongodb')
const cuid = require('cuid')

const OPT = {
  url: 'mongodb://localhost:27017',
  name: 'wdb',
  connection: {
    poolSize: 100,
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
}

const DBOPTIONS = ['fields', 'limit', 'skip', 'sort']

module.exports = async function({ url = OPT.url, connection = OPT.connection, name = OPT.name } = {}) {
  let client
  while (!client || !client.isConnected()) {
    try {
      client = await MongoClient.connect(url, connection)
    } catch (e) {
      await new Promise(r => setTimeout(r, 50))
    }
  }
  const database = client.db(name)

  return function(model) {
    const collection = database.collection(model)

    const getCursor = function(query, options) {
      let cursor = collection.find(query)
      cursor.fields = cursor.project
      for (const option in options) {
        if (DBOPTIONS.includes(option)) {
          cursor = cursor[option](options[option])
        }
      }
      return cursor
    }

    return {
      find: async function(query = {}, options = {}) {
        return await getCursor(query, options).toArray()
      },
      get: async function(query = {}, options = {}) {
        options.limit = 1
        return (await getCursor(query, options).toArray())[0] || null
      },
      count: async function(query = {}, options = {}) {
        return await getCursor(query, options).count()
      },
      create: async function(values = {}) {
        values._id = String(values._id || cuid())
        const result = await collection.insertOne(values)
        return { _id: result.insertedId }
      },
      update: async function(query = {}, values = {}) {
        const result = await collection.updateMany(query, { $set: values })
        return { n: result.modifiedCount }
      },
      delete: async function(query = {}, values = {}) {
        const result = await collection.deleteMany(query)
        return { n: result.deletedCount }
      }
    }
  }
}
