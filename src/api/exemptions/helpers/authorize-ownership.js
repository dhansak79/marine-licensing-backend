import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'
import { getContactId } from './get-contact-id.js'
import { config } from '../../../config.js'

export const authorizeOwnership = async (request, h) => {
  const { authEnabled } = config.get('defraId')

  if (!authEnabled) {
    return h.continue
  }

  const { payload, params, db, auth } = request
  const contactId = getContactId(auth)

  const id = params.id || payload?.id

  const document = await db
    .collection('exemptions')
    .findOne({ _id: ObjectId.createFromHexString(id) })

  if (!document) {
    throw Boom.notFound()
  }
  if (document.contactId !== contactId) {
    throw Boom.notFound('Not authorized to update this resource')
  }

  return h.continue
}
