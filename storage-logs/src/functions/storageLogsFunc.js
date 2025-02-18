const { app } = require('@azure/functions')
const zlib = require('node:zlib')
const { RestClient } = require('../restClient')
const { IAMLogsBatchProto } = require('../models/protobuf/protoLoaderIAMLogs')
const { ParseLogs } = require('../storageLogs')

app.storageBlob('storageLogsCollector', {
  path: '$logs/{name}',
  connection: 'AzureWebJobsStorage',
  handler: async (blob, context) => {
    console.log(`blob: "${context.triggerMetadata.name}"`)
    const httpClient = new RestClient({ apiPath: 'collection' })

    const content = blob.toString()
    const batch = ParseLogs(content)
    if (!batch) {
      console.log('No logs to send')
      return
    }

    const err = IAMLogsBatchProto.verify(batch)
    if (err) {
      console.error(`Error with the proto format: `, err)
    }

    const msg = IAMLogsBatchProto.create(batch)

    const protoBatch = zlib
      .gzipSync(IAMLogsBatchProto.encode(msg).finish())
      .toString('base64')

    try {
      const response = await httpClient.postIAMLogsBatch(
        protoBatch,
        batch.accountId,
        batch.logs.length,
      )
      context.log(
        `Sent ${batch.logs.length} storage logs and got: `,
        response,
      )
    } catch (err) {
      console.error(err)
    }
  },
})
