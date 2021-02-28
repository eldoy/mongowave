const { MongoClient } = require('mongodb')
const cuid = require('cuid')
const _ = require('lodash')

const DEFAULT_CONFIG = {
  url: 'mongodb://localhost:27017',
  name: 'wdb',
  timestamps: true,
  connection: {
    poolSize: 100,
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
}

const DB_FIELD_UPDATE_OPERATORS = ['$inc', '$min', '$max', '$mul']

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

function flipid(obj, out = false) {
  Object.keys(obj).forEach(key => {
    if (key === '_id' && out) {
      obj.id = obj._id
      delete obj._id
    } else if (key === 'id' && !out) {
      obj._id = obj.id
      delete obj.id
    }
    if (obj[key] && typeof obj[key] === 'object') {
      flipid(obj[key], out)
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

  function db(model) {
    const collection = base.collection(model)

    const getCursor = function(query, options) {
      let cursor = collection.find(query)
      cursor.fields = cursor.project
      for (const opt in options) {
        if (DBOPTIONS.includes(opt)) {
          cursor = cursor[opt](options[opt])
        }
      }
      return cursor
    }

    return {

      find: async function(query = {}, options = {}) {
        flipid(query)
        const result = await getCursor(query, options).toArray()
        denullify(result)
        flipid(result, true)
        return result
      },

      get: async function(query = {}, options = {}) {
        flipid(query)
        options.limit = 1
        const result = await getCursor(query, options).toArray()
        denullify(result)
        flipid(result, true)
        return result[0] || null
      },

      count: async function(query = {}, options = {}) {
        flipid(query)
        return await getCursor(query, options).count()
      },

      create: async function(values = {}) {
        const wasArray = Array.isArray(values)
        denullify(values)
        if (!wasArray) values = [values]
        for (const val of values) {
          val._id = String(val._id || val.id || cuid())
          if (config.timestamps) {
            const date = new Date()
            if (!val.created_at) val.created_at = date
            if (!val.updated_at) val.updated_at = date
          }
        }
        const result = await collection.insertMany(values)
        const ids = Object.values(result.insertedIds)
        return wasArray
          ? { ids, n: result.insertedCount }
          : { id: ids[0] }
      },

      update: async function(query = {}, values = {}) {
        flipid(query)

        const operation = {}
        for (const key in values) {
          if (DB_FIELD_UPDATE_OPERATORS.includes(key)) {
            operation[key] = values[key]
            delete values[key]
          } else if (values[key] == null) {
            if (!operation.$unset) operation.$unset = {}
            operation.$unset[key] = ''
          } else {
            if (!operation.$set) operation.$set = {}
            operation.$set[key] = values[key]
          }
        }

        if (!Object.keys(operation).length) return { n: 0}
        if (config.timestamps && operation.$set && !operation.$set.updated_at) {
          operation.$set.updated_at = new Date()
        }
        const result = await collection.updateMany(query, operation)
        return { n: result.modifiedCount }
      },

      delete: async function(query = {}) {
        flipid(query)
        const result = await collection.deleteMany(query)
        return { n: result.deletedCount }
      }
    }
  }

  db.client = client
  db.base = base
  db.drop = function() {
    return base.dropDatabase()
  }

  return db
}
