const { MongoClient, ObjectId } = require('mongodb')
const cuid = require('cuid')
const _ = require('lodash')

process.noDeprecation = true

const DEFAULT_CONFIG = {
  url: 'mongodb://localhost:27017',
  name: 'wdb',
  timestamps: true,
  id: cuid,
  simpleid: true,
  limit: 20,
  connection: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
}

const DB_FIELD_UPDATE_OPERATORS = ['$inc', '$min', '$max', '$mul']

const DBOPTIONS = ['fields', 'limit', 'skip', 'sort']

function denullify(obj) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] && typeof obj[key] === 'object') {
      denullify(obj[key])
    } else if (obj[key] == null) {
      delete obj[key]
    }
  })
}

function parseOptions(obj) {
  for (const key in obj) {
    if (typeof obj[key] == 'undefined') {
      delete obj[key]
    }
  }
  if (typeof obj.limit != 'number' || obj.limit < 1) {
    delete obj.limit
  }
  if (typeof obj.skip != 'number' || obj.skip < 0) {
    delete obj.skip
  }
}

function flipid(obj, out = false) {
  Object.keys(obj).forEach((key) => {
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

function pull(args) {
  let [query, options, callback] = args
  if (typeof query == 'function') {
    callback = query
    query = options = {}
  } else if (typeof options == 'function') {
    callback = options
    options = {}
  }
  return [query, options, callback]
}

module.exports = async function (config = {}) {
  config = _.merge({}, DEFAULT_CONFIG, config)

  const client = new MongoClient(config.url, config.connection)
  await client.connect()

  const base = client.db(config.name)

  function db(model) {
    const collection = base.collection(model)

    const getCursor = function (query, options) {
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
      find: async function (query = {}, options = {}) {
        if (config.simpleid) flipid(query)
        parseOptions(options)
        const result = await getCursor(query, options).toArray()
        denullify(result)
        if (config.simpleid) flipid(result, true)
        return result
      },

      aggregate: async function (pipeline = [], options = {}) {
        if (config.simpleid) flipid(pipeline)
        parseOptions(options)
        const result = await collection.aggregate(pipeline, options).toArray()
        denullify(result)
        if (config.simpleid) flipid(result, true)
        return result
      },

      batch: async function (...args) {
        const [query, options, callback] = pull(args)
        if (config.simpleid) flipid(query)
        parseOptions(options)
        const total = await collection.countDocuments(query)
        const limit = options.limit || config.limit
        const pages = parseInt(total / limit) + 1

        let count = 0
        for (let page = 0; page < pages; page++) {
          const opt = Object.assign({}, options, {
            skip: page * limit,
            limit
          })
          const result = await collection.find(query, opt).toArray()
          denullify(result)
          if (config.simpleid) flipid(result, true)
          count += result.length
          if (typeof callback == 'function') {
            const percent = ((page / pages) * 100).toFixed(2)
            await callback(result, { total, page, pages, count, percent })
          }
        }
      },

      each: async function (...args) {
        const [query, options, callback] = pull(args)
        if (config.simpleid) flipid(query)
        parseOptions(options)
        await getCursor(query, options).forEach(async function (result) {
          denullify(result)
          if (config.simpleid) flipid(result, true)
          if (typeof callback == 'function') {
            await callback(result)
          }
        })
      },

      get: async function (query = {}, options = {}) {
        if (config.simpleid) flipid(query)
        parseOptions(options)
        options.limit = 1
        const result = await getCursor(query, options).toArray()
        denullify(result)
        if (config.simpleid) flipid(result, true)
        return result[0] || null
      },

      count: async function (query = {}, options = {}) {
        if (config.simpleid) flipid(query)
        parseOptions(options)
        return await collection.countDocuments(query, options)
      },

      create: async function (values = {}) {
        values = _.cloneDeep(values)
        const wasArray = Array.isArray(values)
        denullify(values)
        if (!wasArray) values = [values]
        for (const val of values) {
          if (config.id) {
            val._id = String(val._id || val.id || config.id())
          }
          if (config.timestamps) {
            const date = new Date()
            if (!val.created_at) val.created_at = date
            if (!val.updated_at) val.updated_at = date
          }
        }
        await collection.insertMany(values)
        if (config.simpleid) flipid(values, true)
        return wasArray ? values : values[0]
      },

      update: async function (query = {}, values = {}) {
        if (config.simpleid) flipid(query)

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

        if (!Object.keys(operation).length) return { n: 0 }
        if (config.timestamps && operation.$set && !operation.$set.updated_at) {
          operation.$set.updated_at = new Date()
        }
        const result = await collection.updateMany(query, operation)
        return { n: result.modifiedCount }
      },

      delete: async function (query = {}) {
        if (config.simpleid) flipid(query)
        const result = await collection.deleteMany(query)
        return { n: result.deletedCount }
      },

      // Analyze index usage. Very experimental.
      analyze: async function (query = {}, options = {}) {
        function trace(plan) {
          const stages = [plan.stage]
          let inputStage = plan.inputStage
          if (inputStage) {
            do {
              stages.push(inputStage.stage)
            } while ((inputStage = inputStage.inputStage))
          }
          return stages
        }
        const result = await collection.find(query, options).explain()

        console.info(JSON.stringify(result, null, 2))

        const { queryPlanner, executionStats } = result
        console.info(
          `Returned ${executionStats.nReturned} documents in ${
            executionStats.executionTimeMillis / 1000
          }s.`
        )
        console.info(`Total docs examined: ${executionStats.totalDocsExamined}`)

        const stages = trace(queryPlanner.winningPlan)
        console.info({ stages })

        const BADCODES = ['FETCH', 'COLLSCAN']
        // This should be 0 if indexes cover the search
        // totalDocsExamined

        const failed = stages.find((x) => BADCODES.includes(x))

        if (failed) {
          console.info(`Index missing for query:`)
          console.info(JSON.stringify({ model, query, options }, null, 2))
          return result
        } else {
          console.info('Index for this query is good!')
        }
      }
    }
  }

  db.client = client
  db.base = base
  db.id = ObjectId

  // List all collections for a database
  db.collections = function () {
    return base.listCollections().toArray()
  }

  // Add indexes. Experimental.
  db.index = async function (indexes = {}) {
    for (const collection in indexes) {
      const index = indexes[collection]
      for (const values of index) {
        const [fields, options] = values
        try {
          console.info('Adding index to', collection)
          console.info(JSON.stringify(fields, null, 2))
          console.info(JSON.stringify(options || {}, null, 2))
          await db.base.collection(collection).createIndex(fields, options)
        } catch (e) {
          console.info(e.message)
        }
      }
    }
  }

  // Drop indexes. Experimental.
  db.deindex = async function (collections) {
    if (!collections) {
      collections = (await db.collections()).map((c) => c.name)
    }
    for (const collection of collections) {
      try {
        await base.collection(collection).dropIndexes()
      } catch (e) {
        console.info(e.message)
      }
    }
  }

  // Drop database
  db.drop = async function () {
    await db.deindex()
    return base.dropDatabase()
  }

  return db
}
