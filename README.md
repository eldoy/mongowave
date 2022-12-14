# Mongowave MongoDB Client

Javascript MongoDB database client boasting the following features:

* Intuitive API
* Automatic timestamps (created_at, updated_at)
* Custom string id
* Using id instead of _id
* Insert, update and delete multiple by default
* Returns full object on create
* Updates with $set by default
* Retry connection on fail

### Install
`npm i mongowave`

### Usage

Connect to database:
```js
const connection = require('mongowave')
```

Default options:
```js
const db = await connection({
  // URL of database server
  url: 'mongodb://localhost:27017',

  // Name of database
  name: 'wdb',

  // Automatically set created_at and updated_at fields on change
  timestamps: true,

  // Function used to generate ids
  id: cuid,

  // Use 'id' instead of '_id'
  simpleid: true,

  // The default size for batch queries
  batchsize: 20,

  // Connection options for Mongodb Client
  connection: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
})
```

If you want to use underscore ids and ObjectIds (default MongoDB behavior):
```js
const db = await connection({
  // Let MongoDB generate id
  id: false,

  // Use '_id' instead of 'id'
  simpleid: false
})
```

Insert document:
```js
// Returns the full document:
// { id: '507f191e810c19729de860ea', name: 'hello' }
// Takes only 1 argument: values
const result = await db('project').create({ name: 'hello' })
```

Insert multiple documents:
```js
// Returns the full documents:
// [
//   { id: '507f191e810c19729de860ea', name: 'hello' },
//   { id: '607f191e810c19729de860eb', name: 'bye' }
// ]
// Takes only 1 argument: values, must be array of objects
const result = await db('project').create([{ name: 'hello' }, { name: 'bye' }])
```

Update document (updates multiple if query matches):
```js
// Returns the number of updated documents: { n: 1 }
// Takes 2 arguments: query, values
const result = await db('project').update({ id: '507f191e810c19729de860ea' }, { name: 'bye' })
```

Delete document (deletes multiple if query matches):
```js
// Returns the number of deleted documents: { n: 1 }
// Takes 1 argument: query
const result = await db('project').delete({ id: '507f191e810c19729de860ea' })
```

Find documents, all of [the mongodb query operators](https://docs.mongodb.com/manual/reference/operator/query/) work:
```js
// Returns an array of matching documents
// Takes 2 arguments: query, options

// Find all
const result = await db('project').find()

// Find all with name 'bye'
const result = await db('project').find({ name: 'bye' })

// Find with sorting on 'name' field descending, use 1 for ascending
const result = await db('project').find({}, { sort: { name: -1 } })

// Find only 2
const result = await db('project').find({}, { limit: 2 })

// Find but skip 2
const result = await db('project').find({}, { skip: 2 })

// Find all but don't include the 'name' field in the result
const result = await db('project').find({}, { fields: { name: false } })

// Find all with 'level' field greater than 5
const result = await db('project').find({ level: { $gt: 5 }})
```

Get document:
```js
// Returns the first matching document
// Takes 2 arguments: query, options
const result = await db('project').get({ name: 'bye' })
```

Count documents:
```js
// Returns the count of the matching query
// Takes 2 arguments: query, options
const result = await db('project').count({ name: 'bye' })
```

Use the mongodb client base directly:
```js
db.base.collection('project').findOne({ _id: insert.id })
```

The mongodb client:
```js
db.client
```

MongoDB ObjectId short cut:
```js
// Generate a new ID
db.id()
```

There's also `batch`, `each`, `aggregate`, `index`, `deindex` and `analyze`. Read the source code to find out how to use them.

MIT Licensed. Enjoy!
