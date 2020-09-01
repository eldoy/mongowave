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

function denullify(obj) {
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === 'object') {
      denullify(obj[key])
    } else if (obj[key] == null) {
      delete obj[key]
    }
  })
}

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
    const softdelete = typeof modifiers.softdelete !== 'undefined'
      ? modifiers.softdelete
      : config.softdelete
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
        if (softdelete) {
          query.deleted = null
        }
        const result = await getCursor(query, options).toArray()
        denullify(result)
        return result
      },
      get: async function(query = {}, options = {}) {
        if (softdelete) {
          query.deleted = null
        }
        options.limit = 1
        const result = await getCursor(query, options).toArray()
        denullify(result)
        return result[0] || null
      },
      count: async function(query = {}, options = {}) {
        if (softdelete) {
          query.deleted = null
        }
        return await getCursor(query, options).count()
      },
      create: async function(values = {}) {
        denullify(values)
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
        const unset = {}
        for (const key in values) {
          if (values[key] == null) {
            unset[key] = ''
          }
        }
        denullify(values)

        if (softdelete) {
          query.deleted = null
        }
        if (config.timestamps) {
          values.updated_at = new Date()
        }
        const operation = {}
        if (Object.keys(values).length) {
          operation.$set = values
        }
        if (Object.keys(unset).length) {
          operation.$unset = unset
        }

        if (Object.keys(operation).length) {
          const result = await collection.updateMany(query, operation)
          return { n: result.modifiedCount }
        } else {
          return { n: 0}
        }
      },
      delete: async function(query = {}) {
        if (softdelete) {
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
