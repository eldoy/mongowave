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
  batchsize: 1000,
  connection: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
}

const DEFAULT_TIMESTAMPS = { create: 'created_at', update: 'updated_at' }

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
  if (config.timestamps === true) {
    config.timestamps = DEFAULT_TIMESTAMPS
  }
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

    async function find(query = {}, options = {}) {
      if (config.simpleid) flipid(query)
      parseOptions(options)
      const result = await getCursor(query, options).toArray()
      denullify(result)
      if (config.simpleid) flipid(result, true)
      return result
    }

    async function aggregate(pipeline = [], options = {}) {
      if (config.simpleid) flipid(pipeline)
      parseOptions(options)
      const result = await collection.aggregate(pipeline, options).toArray()
      denullify(result)
      if (config.simpleid) flipid(result, true)
      return result
    }

    async function batch(...args) {
      const [query, options, callback] = pull(args)
      if (config.simpleid) flipid(query)
      parseOptions(options)

      const size = options.size || config.batchsize
      delete options.size

      // Fetch ids
      const all = await find(query, {
        sort: options.sort,
        limit: options.limit,
        fields: { id: 1 }
      })

      const total = all.length
      const pages = parseInt(total / size) + 1

      let count = 0
      for (let page = 1; page <= pages; page++) {
        const ids = all.slice(count, page * size).map((x) => x.id)
        const result = await find(
          { id: { $in: ids } },
          { fields: options.fields }
        )
        denullify(result)
        if (config.simpleid) flipid(result, true)
        count += result.length
        if (typeof callback == 'function') {
          const percent = ((page / pages) * 100).toFixed(2)
          await callback(result, {
            total,
            page,
            pages,
            count,
            percent
          })
        }
      }
    }

    async function each(...args) {
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
    }

    async function get(query = {}, options = {}) {
      if (config.simpleid) flipid(query)
      parseOptions(options)
      options.limit = 1
      const result = await getCursor(query, options).toArray()
      denullify(result)
      if (config.simpleid) flipid(result, true)
      return result[0] || null
    }

    async function count(query = {}, options = {}) {
      if (config.simpleid) flipid(query)
      parseOptions(options)
      return await collection.countDocuments(query, options)
    }

    async function create(values = {}, options = {}) {
      values = _.cloneDeep(values)
      const wasArray = Array.isArray(values)
      denullify(values)
      if (!wasArray) values = [values]
      for (const val of values) {
        if (config.id) {
          val._id = String(val._id || val.id || config.id())
        }
        const { create, update } = config.timestamps
        const date = new Date()
        if (create && typeof val[create] == 'undefined') {
          val[create] = date
        }
        if (update && typeof val[update] == 'undefined') {
          val[update] = date
        }
      }
      await collection.insertMany(values, options)
      if (config.simpleid) flipid(values, true)
      return wasArray ? values : values[0]
    }

    async function update(query = {}, values = {}, options = {}) {
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
      const { update } = config.timestamps
      if (
        update &&
        operation.$set &&
        typeof operation.$set[update] == 'undefined'
      ) {
        operation.$set[update] = new Date()
      }
      const result = await collection.updateMany(query, operation, options)
      return { n: result.modifiedCount }
    }

    async function del(query = {}, options = {}) {
      if (config.simpleid) flipid(query)
      const result = await collection.deleteMany(query, options)
      return { n: result.deletedCount }
    }

    async function set(query = {}, values) {
      if (values === null) {
        return await del(query)
      } else if (values) {
        return await update(query, values)
      } else {
        return await create(query)
      }
    }

    async function analyze(query = {}, options = {}) {
      const result = await collection.find(query, options).explain()
      console.info(JSON.stringify(result, null, 2))

      const { queryPlanner, executionStats } = result
      console.info(
        `Returned ${executionStats.nReturned} documents in ${
          executionStats.executionTimeMillis / 1000
        }s.`
      )

      // totalDocsExamined should be 0 if indexes cover the search
      console.info(`Total docs examined: ${executionStats.totalDocsExamined}`)

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
      const stages = trace(queryPlanner.winningPlan)
      console.info({ stages })

      const BADCODES = ['FETCH', 'COLLSCAN']
      const failed = stages.find((x) => BADCODES.includes(x))

      if (failed) {
        console.info(`Index missing for query:`)
        console.info(JSON.stringify({ model, query, options }, null, 2))
        return result
      } else {
        console.info('Index for this query is good!')
      }
    }

    return {
      find,
      aggregate,
      batch,
      each,
      get,
      count,
      create,
      update,
      delete: del,
      set,
      analyze
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
