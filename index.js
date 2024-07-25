const { MongoClient, ObjectId } = require('mongodb')
const cuid = require('cuid')
const lodash = require('lodash')
const extras = require('extras')

const DEFAULT_CONFIG = {
  url: 'mongodb://localhost:27017',
  name: 'wdb',
  timestamps: true,
  id: cuid,
  simpleid: true,
  stringid: true,
  batchsize: 1000,
  quiet: false
}

const DEFAULT_TIMESTAMPS = { create: 'created_at', update: 'updated_at' }

const DB_FIELD_UPDATE_OPERATORS = ['$inc', '$min', '$max', '$mul']

const DBOPTIONS = ['fields', 'limit', 'skip', 'sort']

// Parse options
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

// Support alternative query
function parseQuery(obj) {
  if (typeof obj == 'string') {
    return { id: obj }
  }
  if (Array.isArray(obj)) {
    return { id: { $in: obj } }
  }
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (v === null) {
        return [k, { $type: 10 }]
      } else if (v === undefined) {
        return [k, { $exists: false }]
      }
      return [k, v]
    })
  )
}

// Parse update values
function parseValues(obj, simpleid) {
  obj = lodash.cloneDeep(obj)
  if (obj._id) delete obj._id
  if (obj.updated_at) delete obj.updated_at
  if (simpleid && obj.id) delete obj.id
  return obj
}

// Recursively remove undefined
function denullify(obj) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] && typeof obj[key] === 'object') {
      denullify(obj[key])
    } else if (obj[key] === undefined) {
      delete obj[key]
    }
  })
}

// Turn _id to id and reverse
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

// Helper for function parameters
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
  if (typeof config == 'string') {
    config = { name: config }
  }
  config = lodash.merge({}, DEFAULT_CONFIG, config)
  if (config.timestamps === true) {
    config.timestamps = DEFAULT_TIMESTAMPS
  }
  config.quiet = !!process.env.MONGOWAVE_OPTIONS_QUIET || !!config.quiet

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

    // Finds data all in one go
    async function find(query = {}, options = {}) {
      query = parseQuery(query)
      if (config.simpleid) flipid(query)
      parseOptions(options)
      const result = await getCursor(query, options).toArray()
      denullify(result)
      if (config.simpleid) flipid(result, true)
      return result
    }

    // Find as aggregate
    async function aggregate(pipeline = [], options = {}) {
      if (config.simpleid) flipid(pipeline)
      parseOptions(options)
      const result = await collection.aggregate(pipeline, options).toArray()
      denullify(result)
      if (config.simpleid) flipid(result, true)
      return result
    }

    // Batched find for large datasets
    async function search(...args) {
      const [query, options, callback] = pull(args)
      if (config.simpleid) flipid(query)
      parseOptions(options)

      const size = options.size || config.batchsize
      const limit = options.limit || size
      const total = await count(query, { limit: options.limit })
      const add = typeof options.limit == 'undefined' ? 1 : 0
      const pages = parseInt(total / limit) + add

      let c = 0
      for (let page = 0; page < pages; page++) {
        const result = await find(query, {
          sort: options.sort,
          skip: page * limit,
          limit,
          fields: options.fields
        })
        denullify(result)
        if (config.simpleid) flipid(result, true)
        c += result.length
        if (typeof callback == 'function') {
          const percent = ((page / pages) * 100).toFixed(2)
          await callback(result, {
            total,
            page,
            pages,
            count: c,
            percent
          })
        }
      }
    }

    // Faster batched find for smaller datasets
    async function batch(...args) {
      const [query, options, callback] = pull(args)
      if (config.simpleid) flipid(query)
      parseOptions(options)

      const size = options.size || config.batchsize
      const quiet = options.quiet || config.quiet
      const sync = options.sync || config.sync
      delete options.size
      delete options.quiet
      delete options.sync

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
          {
            fields: options.fields
          }
        )
        denullify(result)
        if (config.simpleid) flipid(result, true)
        count += result.length
        if (typeof callback == 'function') {
          const percent = ((page / pages) * 100).toFixed(2)
          if (!quiet) {
            extras.print(`${percent}% ${total} ${page}/${pages}`)
          }
          if (sync) {
            await Promise.all(result.map(callback))
          } else {
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
    }

    // Find one by one
    async function each(...args) {
      const [query, options, callback] = pull(args)
      if (config.simpleid) flipid(query)
      parseOptions(options)
      var callbacks = []
      await getCursor(query, options).forEach(async function (result) {
        denullify(result)
        if (config.simpleid) flipid(result, true)
        if (typeof callback == 'function') {
          callbacks.push(callback(result))
        }
      })
      await Promise.all(callbacks)
    }

    // Find only one
    async function get(query = {}, options = {}) {
      var result = await find(query, { ...options, limit: 1 })
      return result[0] || null
    }

    // Find first created
    async function first(query = {}) {
      return get(query, { sort: { created_at: 1 } })
    }

    // Find last created
    async function last(query = {}) {
      return get(query, { sort: { created_at: -1 } })
    }

    // Find last updated
    async function changed(query = {}) {
      return get(query, { sort: { updated_at: -1 } })
    }

    // Find ids
    async function ids(query = {}) {
      var result = await find(query, { fields: { id: 1 } })
      return result.map((x) => x.id)
    }

    // Count
    async function count(query = {}, options = {}) {
      query = parseQuery(query)
      if (config.simpleid) flipid(query)
      parseOptions(options)
      return await collection.countDocuments(query, options)
    }

    // Create
    async function create(values = {}, options = {}) {
      values = lodash.cloneDeep(values)
      const wasArray = Array.isArray(values)
      denullify(values)
      if (!wasArray) values = [values]
      if (config.simpleid) flipid(values)
      for (const val of values) {
        if (config.id) {
          val._id = val._id || val.id || config.id()
          if (config.stringid) val._id = String(val._id)
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
      parseOptions(options)
      await collection.insertMany(values, options)
      if (config.simpleid) flipid(values, true)
      return wasArray ? values : values[0]
    }

    // Update
    async function update(query = {}, values = {}, options = {}) {
      query = parseQuery(query)
      if (config.simpleid) flipid(query)
      values = parseValues(values, config.simpleid)
      parseOptions(options)

      const operation = {}
      for (const key in values) {
        if (DB_FIELD_UPDATE_OPERATORS.includes(key)) {
          operation[key] = values[key]
          delete values[key]
        } else if (values[key] === undefined) {
          if (!operation.$unset) operation.$unset = {}
          operation.$unset[key] = ''
        } else {
          if (!operation.$set) operation.$set = {}
          operation.$set[key] = values[key]
        }
      }

      if (!Object.keys(operation).length) return { n: 0 }
      const { update } = config.timestamps
      if (update && (operation.$set || operation.$unset)) {
        if (!operation.$set) operation.$set = {}
        operation.$set[update] = new Date()
      }
      const result = await collection.updateMany(query, operation, options)
      return { n: result.modifiedCount }
    }

    // Upsert
    async function upsert(query = {}, values = {}) {
      var existing = await get(query)
      if (existing) {
        await update(existing.id, values)
        return await get(existing.id)
      }
      return await create(values)
    }

    // Replace
    async function replace(query = {}, values = {}, options = {}) {
      query = parseQuery(query)
      if (config.simpleid) flipid(query)
      values = parseValues(values, config.simpleid)
      denullify(values)
      parseOptions(options)
      const result = await collection.replaceOne(query, values, options)
      return { n: result.modifiedCount }
    }

    // Repsert
    async function repsert(query = {}, values = {}) {
      var existing = await get(query)
      if (existing) {
        await replace(existing.id, values)
        return await get(existing.id)
      }
      return await create(values)
    }

    // Delete
    async function del(query = {}, options = {}) {
      query = parseQuery(query)
      if (config.simpleid) flipid(query)
      parseOptions(options)
      const result = await collection.deleteMany(query, options)
      return { n: result.deletedCount }
    }

    // Set, alternative to create, update and delete
    async function set(query = {}, values) {
      if (values === null) {
        return await del(query)
      } else if (values) {
        return await update(query, values)
      } else {
        return await create(query)
      }
    }

    // Experimental duplicate checker
    async function dups(opt = {}) {
      if (!opt.fields) opt.fields = []

      var d = new Set()

      async function check(doc) {
        var query = {}
        for (var field of opt.fields) {
          query[field] = doc[field]
        }
        var list = (await ids(query)).sort()
        if (list.length > 1) {
          d.add(list.join('|'))
        }
      }

      await batch(async function (docs) {
        await Promise.all(docs.map(check))
      })

      return [...d].map((x) => x.split('|'))
    }

    // Experimental analyzer for queries
    async function analyze(query = {}, options = {}, silent) {
      var result = await collection.find(query, options).explain()
      !silent && console.info(JSON.stringify(result, null, 2))

      const { queryPlanner, executionStats } = result
      !silent &&
        console.info(
          `Returned ${executionStats.nReturned} documents in ${
            executionStats.executionTimeMillis / 1000
          }s.`
        )

      // totalDocsExamined should be 0 if indexes cover the search
      !silent &&
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
      !silent && console.info({ stages })

      const BADCODES = ['FETCH', 'COLLSCAN']
      const failed = stages.find((x) => BADCODES.includes(x))

      if (failed) {
        !silent && console.info(`Index missing for query:`)
        !silent &&
          console.info(JSON.stringify({ model, query, options }, null, 2))
      } else {
        !silent && console.info('Index for this query is good!')
      }

      return { model, query, options, result, stages, failed }
    }

    return {
      find,
      aggregate,
      search,
      batch,
      each,
      get,
      first,
      last,
      changed,
      ids,
      count,
      create,
      update,
      upsert,
      replace,
      repsert,
      delete: del,
      set,
      dups,
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

  // Add indexes
  db.index = async function (indexes = {}) {
    for (const collection in indexes) {
      const index = indexes[collection]
      for (const values of index) {
        const [fields, options] = values
        try {
          console.info('Adding index to', collection)
          console.info(JSON.stringify(fields, null, 2))
          console.info(JSON.stringify(options || {}, null, 2))
          await base.collection(collection).createIndex(fields, options)
        } catch (e) {
          console.info(e.message)
        }
      }
    }
  }

  // Drop indexes
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
