const { MongoClient, ObjectId } = require('mongodb')

const OPT = {
  url: 'mongodb://localhost:27017',
  name: 'mongopath',
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

  return function(path) {
    const [model, command] = path.split('/')
    const collection = database.collection(model)

    return function(...args) {
      const [query = {}, values = {}, options = {}] = (function(){
        switch(command) {
          case 'insert': return [undefined, args[0], args[1]]
          case 'update': return args
          default: return [args[0], undefined, args[1]]
        }
      }())

      const getCursor = function() {
        let cursor = collection.find(query)
        cursor.fields = cursor.project
        for (const option in options) {
          if (DBOPTIONS.includes(option)) {
            cursor = cursor[option](options[option])
          }
        }
        return cursor
      }

      return (async function() {
        let result
        switch(command) {
          case 'find':
            return await getCursor().toArray()
          case 'get':
            options.limit = 1
            return (await getCursor().toArray())[0] || null
          case 'count':
            return await getCursor().count()
          case 'insert':
            values._id = String(values._id || ObjectId())
            result = await collection.insertOne(values)
            return { _id: result.insertedId }
          case 'update':
            result = await collection.updateMany(query, { $set: values })
            return { n: result.modifiedCount }
          case 'remove':
            result = await collection.deleteMany(query)
            return { n: result.deletedCount }
          default:
            throw new Error('command not supported')
        }
      }())
    }
  }
}
