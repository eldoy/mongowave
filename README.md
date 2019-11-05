# Mongopath MongoDB Client
The client uses the `model/command` syntax. All commands return promises (async functions), so remember to use await. Ids are stored as strings unless overridden.

Each function takes query, values and options arguments depending on the command. Most mongodb options and query parameters are supported.

### Install
`npm i mongopath`

### Usage
```javascript
/* Connect to database */
const connection = require('mongopath')

/* Default options */
const db = await connection({ url: 'mongodb://localhost:27017', name: 'mongopath' })

/* Insert document */
// Returns the inserted id: { _id: '507f191e810c19729de860ea' }
// Takes only 1 argument: query
const result = await db('project/insert')({ name: 'hello' })

/* Update document (updates multiple if query matches) */
// Returns the number of updated documents: { n: 1 }
// Takes 2 arguments: query, values
const result = await db('project/update')({ _id: '507f191e810c19729de860ea' }, { name: 'bye' })

/* Remove document (removes multiple if query matches) */
// Returns the number of removed documents: { n: 1 }
// Takes 1 argument: query
const result = await db('project/remove')({ _id: '507f191e810c19729de860ea' })

/* Find document */
// Returns an array of matching documents
// Takes 2 arguments: query, options

// Find all
const result = await db('project/find')()

// Find all with name 'bye'
const result = await db('project/find')({ name: 'bye' })

// Find with sorting on 'name' field descending, use 1 for ascending
const result = await db('project/find')({}, { sort: { name: -1 } })

// Find only 2
const result = await db('project/find')({}, { limit: 2 })

// Find but skip 2
const result = await db('project/find')({}, { skip: 2 })

// Find all but don't include the 'name' field in the result
const result = await db('project/find')({}, { fields: { name: false } })

// Find all with 'level' field greater than 5
const result = await db('project/find')({ level: { $gt: 5 }})

// All of the mongodb query operators work:
// https://docs.mongodb.com/manual/reference/operator/query/

/* Get document */
// Returns the first matching document
// Takes 2 arguments: query, options
const result = await db('project/get')({ name: 'bye' })

/* Count documents */
// Returns the count of the matching query
// Takes 2 arguments: query, options
const result = await db('project/count')({ name: 'bye' })
```

The source code and tests contain more examples of use.

MIT Licensed. Enjoy!
