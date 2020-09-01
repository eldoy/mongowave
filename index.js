const { MongoClient } = require('mongodb')
const cuid = require('cuid')
const _ = require('lodash')

const DEFAULT_CONFIG = {
  url: 'mongodb://localhost:27017',
  name: 'wdb',
  timestamps: false,
  softdelete: false,
  connection: {
    poolSize: 100,
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
}

const DBOPTIONS = ['fields', 'limit', 'skip', 'sort']

module.exports = async function(config = {}) {
  config = _.merge({}, DEFAULT_CONFIG, config)

  let client
  while (!client || !client.isConnected()) {
    try {
      client = await MongoClient.connect(config.url, config.connection)
    } catch (e) {
      await new Promise(r => setTimeout(r, 50))
    }
  }

  const base = client.db(config.name)

  function db(model, modifiers = {}) {
    const collection = base.collection(model)

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
        if (config.softdelete && !modifiers.deleted) {
          query.deleted = null
        }
        return await getCursor(query, options).toArray()
      },
      get: async function(query = {}, options = {}) {
        if (config.softdelete && !modifiers.deleted) {
          query.deleted = null
        }
        options.limit = 1
        return (await getCursor(query, options).toArray())[0] || null
      },
      count: async function(query = {}, options = {}) {
        if (config.softdelete && !modifiers.deleted) {
          query.deleted = null
        }
        return await getCursor(query, options).count()
      },
      create: async function(values = {}) {
        values._id = String(values._id || cuid())
        if (config.timestamps) {
          const date = new Date()
          values.created_at = date
          values.updated_at = date
        }
        const result = await collection.insertOne(values)
        return { _id: result.insertedId }
      },
      update: async function(query = {}, values = {}) {
        if (config.softdelete && !modifiers.deleted) {
          query.deleted = null
        }
        if (config.timestamps) {
          values.updated_at = new Date()
        }
        const result = await collection.updateMany(query, { $set: values })
        return { n: result.modifiedCount }
      },
      delete: async function(query = {}) {
        if (config.softdelete && !modifiers.deleted) {
          const result = await collection.updateMany(query, { $set: { deleted: true, deleted_at: new Date() } })
          return { n: result.modifiedCount }
        }
        const result = await collection.deleteMany(query)
        return { n: result.deletedCount }
      }
    }
  }

  db.client = client
  db.base = base

  return db
}
