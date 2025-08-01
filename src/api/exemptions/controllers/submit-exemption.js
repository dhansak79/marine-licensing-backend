import Boom from '@hapi/boom'
import { StatusCodes } from 'http-status-codes'
import { submitExemption } from '../../../models/submit-exemption.js'
import { ObjectId } from 'mongodb'
import { createTaskList } from '../helpers/createTaskList.js'
import { generateApplicationReference } from '../helpers/reference-generator.js'
import { authorizeOwnership } from '../helpers/authorize-ownership.js'
import { EXEMPTION_STATUS } from '../../../common/constants/exemption.js'
import { REQUEST_QUEUE_STATUS } from '../../../common/constants/request-queue.js'
import { config } from '../../../config.js'

export const submitExemptionController = {
  options: {
    payload: {
      parse: true,
      output: 'data'
    },
    pre: [{ method: authorizeOwnership }],
    validate: {
      payload: submitExemption
    }
  },
  handler: async (request, h) => {
    try {
      const { payload, db, locker } = request
      const { id, createdAt, createdBy, updatedAt, updatedBy } = payload
      const { isDynamicsEnabled } = config.get('dynamics')

      const exemption = await db
        .collection('exemptions')
        .findOne({ _id: ObjectId.createFromHexString(id) })

      if (!exemption) {
        throw Boom.notFound('Exemption not found')
      }

      if (exemption.applicationReference) {
        throw Boom.conflict('Exemption has already been submitted')
      }

      const taskList = createTaskList(exemption)

      const incompleteTasks = Object.entries(taskList)
        .filter(([_task, status]) => status !== 'COMPLETED')
        .map(([task]) => task)

      if (incompleteTasks.length > 0) {
        throw Boom.badRequest(
          'Exemption is incomplete. Missing sections: ' +
            incompleteTasks.join(', ')
        )
      }

      const applicationReference = await generateApplicationReference(
        db,
        locker,
        'EXEMPTION'
      )

      const submittedAt = new Date()

      const updateResult = await db.collection('exemptions').updateOne(
        { _id: ObjectId.createFromHexString(id) },
        {
          $set: {
            applicationReference,
            submittedAt,
            status: EXEMPTION_STATUS.CLOSED,
            updatedAt,
            updatedBy
          }
        }
      )

      if (updateResult.matchedCount === 0) {
        throw Boom.notFound('Exemption not found during update')
      }

      if (isDynamicsEnabled) {
        await db.collection('exemption-dynamics-queue').insertOne({
          applicationReferenceNumber: applicationReference,
          status: REQUEST_QUEUE_STATUS.PENDING,
          retries: 0,
          createdAt,
          createdBy,
          updatedAt,
          updatedBy
        })

        await request.server.methods.processExemptionsQueue()
      }

      return h
        .response({
          message: 'success',
          value: {
            applicationReference,
            submittedAt: submittedAt.toISOString()
          }
        })
        .code(StatusCodes.OK)
    } catch (error) {
      if (error.isBoom) {
        throw error
      }
      throw Boom.internal(`Error submitting exemption: ${error.message}`)
    }
  }
}
