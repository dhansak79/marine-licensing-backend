import joi from 'joi'
import { exemptionId } from '../shared-models.js'
import { coordinatesEntryFieldSchema } from './coordinates-entry.js'
import { coordinatesTypeFieldSchema } from './coordinates-type.js'
import { coordinateSystemFieldSchema } from './coordinate-system.js'
import { circleWidthValidationSchema } from './circle-width.js'
import { COORDINATE_SYSTEMS } from '../../common/constants/coordinates.js'
import { wgs84ValidationSchema } from './wgs84.js'
import { osgb36ValidationSchema } from './osgb36.js'
import {
  fileUploadTypeFieldSchema,
  geoJSONFieldSchema,
  featureCountFieldSchema,
  uploadedFileFieldSchema,
  s3LocationFieldSchema
} from './file-upload.js'

export const siteDetailsSchema = joi
  .object({
    siteDetails: joi
      .object({
        coordinatesType: coordinatesTypeFieldSchema,
        // File upload fields (conditional)
        fileUploadType: joi.when('coordinatesType', {
          is: 'file',
          then: fileUploadTypeFieldSchema,
          otherwise: joi.forbidden()
        }),
        geoJSON: joi.when('coordinatesType', {
          is: 'file',
          then: geoJSONFieldSchema,
          otherwise: joi.forbidden()
        }),
        featureCount: joi.when('coordinatesType', {
          is: 'file',
          then: featureCountFieldSchema,
          otherwise: joi.forbidden()
        }),
        uploadedFile: joi.when('coordinatesType', {
          is: 'file',
          then: uploadedFileFieldSchema,
          otherwise: joi.forbidden()
        }),
        s3Location: joi.when('coordinatesType', {
          is: 'file',
          then: s3LocationFieldSchema,
          otherwise: joi.forbidden()
        }),
        // Manual coordinate fields (conditional)
        coordinatesEntry: joi.when('coordinatesType', {
          is: 'coordinates',
          then: coordinatesEntryFieldSchema,
          otherwise: joi.forbidden()
        }),
        coordinateSystem: joi.when('coordinatesType', {
          is: 'coordinates',
          then: coordinateSystemFieldSchema,
          otherwise: joi.forbidden()
        }),
        circleWidth: joi.when('coordinatesType', {
          is: 'coordinates',
          then: circleWidthValidationSchema,
          otherwise: joi.forbidden()
        }),
        coordinates: joi.when('coordinatesType', {
          is: 'coordinates',
          then: joi.alternatives().conditional('coordinateSystem', {
            is: COORDINATE_SYSTEMS.WGS84,
            then: wgs84ValidationSchema,
            otherwise: osgb36ValidationSchema
          }),
          otherwise: joi.forbidden()
        })
      })
      .required()
      .messages({
        'any.required': 'SITE_DETAILS_REQUIRED'
      })
  })
  .append(exemptionId)
