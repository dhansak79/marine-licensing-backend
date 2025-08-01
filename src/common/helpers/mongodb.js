import { MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

import { config } from '../../config.js'
import { addCreateAuditFields, addUpdateAuditFields } from './mongo-audit.js'

const mongoConfig = config.get('mongo')

export const addAuditFields = (request, h) => {
  const requestMethod = request.method.toUpperCase()

  if (requestMethod === 'GET') {
    return h.continue
  }

  const isUnauthenticatedRequest = !request.auth?.credentials

  if (isUnauthenticatedRequest) {
    return h.continue
  }

  const { auth, payload } = request

  if (requestMethod === 'POST') {
    request.payload = addCreateAuditFields(auth, payload)
    return h.continue
  }

  request.payload = addUpdateAuditFields(auth, payload)

  return h.continue
}

export const mongoDb = {
  plugin: {
    name: 'mongodb',
    version: '1.0.0',
    register: async function (server, options) {
      server.logger.info('Setting up MongoDb')

      const client = await MongoClient.connect(options.mongoUri, {
        retryWrites: options.retryWrites,
        readPreference: options.readPreference,
        ...(server.secureContext && { secureContext: server.secureContext })
      })

      const databaseName = options.databaseName
      const db = client.db(databaseName)
      const locker = new LockManager(db.collection('mongo-locks'))

      await createIndexes(db)

      server.logger.info(`MongoDb connected to ${databaseName}`)

      server.decorate('server', 'mongoClient', client)
      server.decorate('server', 'db', db)
      server.decorate('server', 'locker', locker)
      server.decorate('request', 'db', () => db, { apply: true })
      server.decorate('request', 'locker', () => locker, { apply: true })

      server.ext('onPreHandler', addAuditFields)

      server.events.on('stop', async () => {
        server.logger.info('Closing Mongo client')
        await client.close(true)
      })
    }
  },
  options: {
    mongoUri: mongoConfig.uri,
    databaseName: mongoConfig.databaseName,
    retryWrites: false,
    readPreference: 'secondary'
  }
}

async function createIndexes(db) {
  await db.collection('mongo-locks').createIndex({ id: 1 })

  await db.collection('exemptions').createIndex({ id: 1 })
  await db
    .collection('reference-sequences')
    .createIndex({ key: 1 }, { unique: true })

  await db.collection('exemption-dynamics-queue').createIndex({ status: 1 })
  await db.collection('exemption-dynamics-queue-failed').createIndex({ id: 1 })
}
