const axios = require('axios')
const config = require('config')
const { FlowLogsBatch } = require('./models/flowLogs')

class RestClient {
  constructor(options) {
    this.apiUrl = config.get('apiUrl')
    // assert(this.apiUrl, 'Missing API_URL env var')
    this.apiVersion = config.get('apiVersion')
    if (!options.apiPath) {
      throw new Error('missing api path')
    }
    this.tokenHeader = config.get('streamSecurityTokenHeader')

    try {
      this.baseApiUrl = new URL(
        `${this.apiUrl}/api/${this.apiVersion}/${options.apiPath}/`,
      )
      console.log(`Current API url: ${this.baseApiUrl}`)
    } catch (e) {
      throw new Error(`wrong API url - error: ${e}`)
    }

    this.client = axios.create({
      baseURL: this.baseApiUrl.toString(),
      timeout: 15 * 1000,
      headers: {
        'Content-Type': 'application/json',
        [this.tokenHeader]: config.get('apiToken'),
        Accept: 'application/json;q=0.5, text/plain;q=0.1',
      },
    })
  }

  async postFlowLogsBatch(flowLogsSerializedBatch, accountId, recordCount) {
    if (!flowLogsSerializedBatch) {
      throw new Error(
        'Missing the required parameter \'flowLogsSerializedBatch\' when calling postFlowLogsBatch',
      )
    }
    const resp = await this._requestHandler(
      'batch',
      new FlowLogsBatch(flowLogsSerializedBatch, accountId, recordCount),
    )
    return resp.body
  }

  /**
   * Invokes the REST service using the supplied settings and parameters.
   * @param {String} path The URL path to invoke (auth prefixed by base url)
   * @param {Object} data The value to pass as the request body.
   * @returns {Object}
   */
  async _requestHandler(path, data) {
    let resp
    try {
      console.log(`POST to ${this.baseApiUrl}${path}`)
      resp = await this.client.post(path, data)
    } catch (e) {
      console.log(
        `error while sending to Stream Security API - error message: ${e}, code: ${
          e?.code || e?.response?.statusCode
        }`,
      )
      throw e
    }
    return { body: resp.data, statusCode: resp.status }
  }
}

module.exports = {
  RestClient,
}
