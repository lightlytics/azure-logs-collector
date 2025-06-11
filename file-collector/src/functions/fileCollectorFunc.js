const { app } = require('@azure/functions')
const axios = require('axios')

app.storageBlob('fileCollector', {
  path: `${process.env.BLOB_CONTAINER}/{name}.log.gz`,
  connection: 'AzureWebJobsStorage',
  handler: async (blob, context) => {
    const blobName = context.triggerMetadata.name
    const apiUrl = process.env.API_URL.replace(/\/+$/, '') + '/api/v1/collection/' + (process.env.API_URL_SUFFIX || '')
    const apiToken = process.env.API_TOKEN

    try {
      const payloadObj = { data: Buffer.from(blob).toString('base64') }
      const payloadStr = JSON.stringify(payloadObj)

      const response = await axios.post(apiUrl, payloadStr, {
        headers: {
          'Content-Type': 'application/json',
          'X-Lightlytics-Token': apiToken,
        },
        timeout: 3500,
      })

      console.log(`Sent: ${blobName}, response status: ${response.status}`)
    } catch (err) {
      console.error(`Failed to forward file ${blobName}:`, err.message)
    }
  },
})

