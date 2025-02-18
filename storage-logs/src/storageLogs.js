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

function extractIdentityAndType(logObject) {
  let identity = ''
  let identityType = ''

  if (logObject.userPrincipalName) {
    identity = logObject.userPrincipalName
    identityType = 'azure_user'
  } else if (logObject.userObjectId) {
    identity = logObject.userObjectId
    identityType = 'Unknown'
  } else if (logObject.applicationId) {
    identity = logObject.applicationId
    identityType = 'Unknown'
  } else if (logObject.requesterAccountName !== logObject.ownerAccountName) {
    identity = logObject.requesterAccountName
    identityType = 'Cloud_Azure'
  }

  return { identity, identityType }
}

function extractSubscriptionId(requestedObjectKey) {
  const match = requestedObjectKey.match(/\/SUBSCRIPTIONS\/([A-Z0-9-]+)\//i)
  return match ? String(match[1]).toLowerCase() : ''
}

const ParseLogs = logs => {
  const iamLogs = []
  for (const log of logs.split('\n')) {
    if (!log) continue
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

      const isErrorLog = isErrorCode(logObject.httpStatusCode)
      const { identity, identityType } = extractIdentityAndType(logObject)
      const subscriptionId = extractSubscriptionId(logObject.requestedObjectKey)

      const iamLog = IAMLogProto.create({
        eventTime: logObject.requestStartTime,
        accountId: logObject.tenantId || subscriptionId,
        sourceIPAddress: logObject.requesterIpAddress,
        identity,
        identityType,
        action: logObject.operationType,
        destination: logObject.requestedObjectKey,
        additionalInfo: '',
        region: '',
        count: 1,
        userAgent: logObject.userAgentHeader,
        errorCode: isErrorLog ? logObject.httpStatusCode : '',
        errorMessage: isErrorLog ? logObject.requestStatus : '',
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
