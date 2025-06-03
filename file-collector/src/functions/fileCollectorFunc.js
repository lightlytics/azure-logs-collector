const { app } = require('@azure/functions')
const axios = require('axios')

app.storageBlob('fileCollector', {
  path: process.env.BLOB_CONTAINER + '/{name}',
  connection: 'AzureWebJobsStorage',
  handler: async (blob, context) => {
    const apiUrl = process.env.API_URL.replace(/\/+$/, '') + '/api/v1/collection/' + (process.env.API_URL_SUFFIX || '')
    const apiToken = process.env.API_TOKEN
    const blobName = context.triggerMetadata.name

    try {
      const payloadObj = { data: Buffer.from(blob).toString('base64') }
      const payloadStr = JSON.stringify(payloadObj)

      await axios.post(apiUrl, payloadStr, {
        headers: {
          'Content-Type': 'application/json',
          'X-Lightlytics-Token': apiToken,
        },
        timeout: 3500,
      })
      context.log(`Sent: ${blobName}`)
    } catch (err) {
      context.log.error(`Failed to forward file ${blobName}:`, err)
    }
  },
})
