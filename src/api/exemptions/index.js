import { getExemptionController } from './controllers/get-exemption.js'
import { getExemptionsController } from './controllers/get-exemptions.js'
import { createProjectNameController } from './controllers/create-project-name.js'
import { updateProjectNameController } from './controllers/update-project-name.js'
import { updatePublicRegisterController } from './controllers/update-public-register.js'
import { updateSiteDetailsController } from './controllers/update-site-details.js'
import { createActivityDescriptionController } from './controllers/create-activity-description.js'
import { createActivityDatesController } from './controllers/update-activity-dates.js'
import { submitExemptionController } from './controllers/submit-exemption.js'

export const exemptions = [
  {
    method: 'GET',
    path: '/exemption/{id}',
    ...getExemptionController
  },
  {
    method: 'GET',
    path: '/exemptions',
    ...getExemptionsController
  },
  {
    method: 'POST',
    path: '/exemption/project-name',
    ...createProjectNameController
  },
  {
    method: 'PATCH',
    path: '/exemption/project-name',
    ...updateProjectNameController
  },
  {
    method: 'PATCH',
    path: '/exemption/public-register',
    ...updatePublicRegisterController
  },
  {
    method: 'PATCH',
    path: '/exemption/site-details',
    ...updateSiteDetailsController
  },
  {
    method: 'PATCH',
    path: '/exemption/activity-description',
    ...createActivityDescriptionController
  },
  {
    method: 'PATCH',
    path: '/exemption/activity-dates',
    ...createActivityDatesController
  },
  {
    method: 'POST',
    path: '/exemption/submit',
    ...submitExemptionController
  }
]
