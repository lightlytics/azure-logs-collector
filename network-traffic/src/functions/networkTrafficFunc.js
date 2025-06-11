const { app } = require('@azure/functions')
const zlib = require('zlib')
const config = require('config')
const { RestClient } = require('../restClient')
const { ParseFlows } = require('../flows')
const { flowLogsBatchProto } = require('../models/protobuf/proto')

app.storageBlob('networkTrafficCollector', {
  path: `${config.get('networkTrafficBlobContainer')}/{name}`,
  connection: 'AzureWebJobsStorage',
  handler: async (blob, context) => {
    console.log(`blob: "${context.triggerMetadata.name}"`)
    const httpClient = new RestClient({ apiPath: 'collection/flowlogs' })

    const content = JSON.parse(blob.toString())
    const flowsBatch = ParseFlows(content)

    const err = flowLogsBatchProto.verify(flowsBatch)
    if (err) {
      console.error(`Error with the proto format: `, err)
    }

    const msg = flowLogsBatchProto.create(flowsBatch)

    const protoBatch = Buffer.from(
      zlib.gzipSync(Buffer.from(flowLogsBatchProto.encode(msg).finish())),
    ).toString('base64')

    try {
      const response = await httpClient.postFlowLogsBatch(
        protoBatch,
        flowsBatch.accountIdString,
        flowsBatch.logs.length,
      )
      context.log(
        `Sent ${flowsBatch.logs.length} flow records and got: `,
        response,
      )
    } catch (err) {
      console.error(err)
    }
  },
})
