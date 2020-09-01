const { MongoClient } = require('mongodb')
const cuid = require('cuid')
const _ = require('lodash')

const DEFAULT_CONFIG = {
  url: 'mongodb://localhost:27017',
  name: 'wdb',
  timestamps: false,
  softdelete: false,
  fakeid: false,
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

  function db(model, modifiers = {}) {
    const { softdelete, fakeid } = { ...config, ...modifiers }
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
        if (fakeid) {
          flipid(query)
        }
        if (softdelete) {
          query.deleted = null
        }
        const result = await getCursor(query, options).toArray()
        denullify(result)
        if (fakeid) {
          flipid(result, true)
        }
        return result
      },
      get: async function(query = {}, options = {}) {
        if (fakeid) {
          flipid(query)
        }
        if (softdelete) {
          query.deleted = null
        }
        options.limit = 1
        const result = await getCursor(query, options).toArray()
        denullify(result)
        if (fakeid) {
          flipid(result, true)
        }
        return result[0] || null
      },
      count: async function(query = {}, options = {}) {
        if (fakeid) {
          flipid(query)
        }
        if (softdelete) {
          query.deleted = null
        }
        return await getCursor(query, options).count()
      },
      create: async function(values = {}) {
        denullify(values)

        values._id = String(values._id || (fakeid ? values.id : false) || cuid())
        if (config.timestamps) {
          values.created_at = values.updated_at = new Date()
        }
        const result = await collection.insertOne(values)
        return { [fakeid ? 'id' : '_id']: result.insertedId }
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
        if (fakeid) {
          flipid(query)
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
        if (fakeid) {
          flipid(query)
        }
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
