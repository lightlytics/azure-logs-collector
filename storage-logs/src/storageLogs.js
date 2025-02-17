const { IAMLogProto } = require('./models/protobuf/protoLoaderIAMLogs')
const logTemplate = {
  '1.0': ['version', 'requestStartTime', 'operationType', 'requestStatus', 'httpStatusCode', 'endToEndLatencyInMs', 'serverLatencyInMs', 'authenticationType', 'requesterAccountName', 'ownerAccountName', 'serviceType', 'requestUrl', 'requestedObjectKey', 'requestIdHeader', 'operationCount', 'requesterIpAddress', 'requestVersionHeader', 'requestHeaderSize', 'requestPacketSize', 'responseHeaderSize', 'responsePacketSize', 'requestContentLength', 'requestMd5', 'serverMd5', 'etagIdentifier', 'lastModifiedTime', 'conditionsUsed', 'userAgentHeader', 'referrerHeader', 'clientRequestId'],
  '2.0': ['version', 'requestStartTime', 'operationType', 'requestStatus', 'httpStatusCode', 'endToEndLatencyInMs', 'serverLatencyInMs', 'authenticationType', 'requesterAccountName', 'ownerAccountName', 'serviceType', 'requestUrl', 'requestedObjectKey', 'requestIdHeader', 'operationCount', 'requesterIpAddress', 'requestVersionHeader', 'requestHeaderSize', 'requestPacketSize', 'responseHeaderSize', 'responsePacketSize', 'requestContentLength', 'requestMd5', 'serverMd5', 'etagIdentifier', 'lastModifiedTime', 'conditionsUsed', 'userAgentHeader', 'referrerHeader', 'clientRequestId', 'userObjectId', 'tenantId', 'applicationId', 'resourceId', 'issuer', 'userPrincipalName', 'reserved', 'authorizationDetail'],
}
const SEPARATOR = ';'
const htmlEntities = {
  '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&apos;': '\'', '&nbsp;': ' ',
}

const decodeHtmlEntities = (str) => {
  return str.replace(/&amp;|&quot;|&lt;|&gt;|&apos;|&nbsp;/g, (match) => htmlEntities[match])
}

const splitLogLine = log => {
  const fields = []
  let currentField = ''
  let insideQuotes = false

  for (let i = 0; i < log.length; i++) {
    const char = log[i]

    if (char === '"' && (i === 0 || log[i - 1] !== '\\')) {
      insideQuotes = !insideQuotes
    } else if (char === SEPARATOR && !insideQuotes) {
      fields.push(decodeHtmlEntities(currentField.trim()))
      currentField = ''
    } else {
      currentField += char
    }
  }

  fields.push(decodeHtmlEntities(currentField.trim()))
  return fields
}

const removePort = ip =>
  ip.includes(':') ? ip.split(':')[0] : ip

const isErrorCode = httpStatusCode => {
  const statusCode = parseInt(httpStatusCode, 10)
  return statusCode >= 400 && statusCode < 600
}

const ParseLogs = logs => {
  const iamLogs = []
  for (const log of logs) {
    const logFields = splitLogLine(log)
    const version = logFields[0]
    const template = logTemplate[version]

    if (template) {
      const logObject = {}
      template.forEach((field, index) => {
        logObject[field] = logFields[index] || ''
      })

      if (logObject.requesterIpAddress) {
        logObject.requesterIpAddress = removePort(logObject.requesterIpAddress)
      }

      const iamLog = IAMLogProto.create({
        eventTime: log.requestStartTime,
        accountId: log.tenantId || log.ownerAccountName,
        sourceIPAddress: requesterIpAddress,
        identity: logObject.userPrincipalName || logObject.userObjectId || logObject.applicationId || logObject.requesterAccountName,
        identityType: '',
        action: log.operationType,
        destination: log.requestedObjectKey,
        additionalInfo: '',
        region: '',
        count: 1,
        userAgent: log.userAgentHeader,
        errorCode: log.httpStatusCode,
        errorMessage: isErrorCode(log.httpStatusCode) ? log.requestStatus : '',
        consoleSession: false,
        mfaAuthenticated: false,
        sessionName: '',
        sessionId: '',
        newSessionId: '',
        newSessionExpiration: '',
        cloudType: 'Cloud_Azure',
      })
      iamLogs.push(iamLog)
    }
  }
  if (iamLogs.length === 0) return

  return {
    logs: iamLogs,
    accountId: iamLogs[0].accountId,
  }
}

module.exports = {
  ParseLogs,
}
