const { Timestamp } = require('google-protobuf/google/protobuf/timestamp_pb')
const {
  flowLogsMsgProto,
  FlowLogsDeviceTypeEnum,
  FlowLogActionEnum,
} = require('../models/protobuf/proto')
const iana = require('./iana.json')

const flowCategoryInfo = {
  NetworkSecurityGroupFlowEvent: {
    type: 'azure_network_security_group',
    resourceId: 'resourceId',
    properties: 'properties',
    flows: 'flows',
    flowGroups: 'flows',
    // fields https://learn.microsoft.com/en-us/azure/network-watcher/media/network-watcher-nsg-flow-logging-overview/tuple.png
    fields: [
      'start',
      'srcaddr',
      'dstaddr',
      'srcport',
      'dstport',
      'protocol', // U / T
      'flow_direction', // I / O
      'traffic_decision', // A / D
      'flow_state', // B / C / E
      'packets_sent',
      'bytes_sent',
      'packets_received',
      'bytes_received',
    ],
  },
  FlowLogFlowEvent: {
    type: 'azure_virtual_network',
    resourceId: 'targetResourceID',
    properties: 'flowRecords',
    flows: 'flows',
    flowGroups: 'flowGroups',
    // fields https://learn.microsoft.com/en-us/azure/network-watcher/media/vnet-flow-logs-overview/vnet-flow-log-format.png#lightbox
    fields: [
      'startms',
      'srcaddr',
      'dstaddr',
      'srcport',
      'dstport',
      'protocol', // 6 - TCP, 17 - UDP
      'flow_direction',
      'flow_state', // B / C / E / [D]enied
      'flow_encryption',
      'packets_sent',
      'bytes_sent',
      'packets_received',
      'bytes_received',
    ],
  },
}

const extractor = (type, data) => {
  const flowInfo = flowCategoryInfo[type]
  return data[flowInfo.properties].flows.reduce(
    (acc, flow) => [
      ...acc,
      ...flow[flowInfo.flowGroups].reduce(
        (acc, tuple) => [
          ...acc,
          ...tuple.flowTuples.map(t => ParseLog(t, flowInfo)),
        ],
        [],
      ),
    ],
    [],
  )
}

const ParseLog = (rawLog, flowInfo) => {
  const log = {}
  rawLog.split(',').forEach((value, fieldIndex) => {
    const fieldName = flowInfo.fields[fieldIndex]
    log[fieldName] = value
  })

  return log
}

const ParseFlows = data => {
  const logs = []
  const category = data.records?.[0]?.category
  const resourceIdField = flowCategoryInfo[category].resourceId
  const resourceId =
    data.records?.[0][resourceIdField] ||
    data.records?.[0]['flowLogResourceID'] ||
    data.records?.[0]['resourceId']

  const flows = data.records.reduce(
    (acc, record) => [...acc, ...extractor(record.category, record)],
    [],
  )

  flows.forEach(log => {
    if (log.bytes_received) {
      logs.push(FlowlogConverter(SwapLogDirection(log), true))
    }
    logs.push(FlowlogConverter(log))
  })

  const accountIdString = String(resourceId?.split('/')[2]).toLowerCase()

  return {
    accountIdString,
    deviceType: FlowLogsDeviceTypeEnum.values.AZURE_FLOW_LOGS,
    vpcId: category === 'FlowLogFlowEvent' ? resourceId : '',
    deviceId: flowCategoryInfo[category]?.type || category,
    logs,
  }
}

const SwapLogDirection = log => {
  const swappedLog = { ...log }
  swappedLog.srcaddr = log.dstaddr
  swappedLog.dstaddr = log.srcaddr
  swappedLog.srcport = log.dstport
  swappedLog.dstport = log.srcport
  swappedLog.bytes_sent = log.bytes_received
  swappedLog.bytes_received = log.bytes_sent

  return swappedLog
}

const FlowlogConverter = (
  {
    start,
    startms,
    srcaddr,
    dstaddr,
    srcport,
    dstport,
    protocol,
    traffic_decision,
    flow_state,
    bytes_sent,
  },
  swapped = false,
) => {
  const date = new Date(start ? Number(start) * 1000 : Number(startms))
  const protocolCode = isNaN(protocol)
    ? protocol === 'T'
      ? 6
      : 17
    : Number(protocol)
  const action =
    traffic_decision === 'D' || flow_state === 'D'
      ? FlowLogActionEnum.values.REJECT
      : FlowLogActionEnum.values.ACCEPT
  return flowLogsMsgProto.create({
    start: dateToProtoTimestamp(date),
    end: dateToProtoTimestamp(date),
    srcaddr,
    dstaddr,
    srcport: Number(srcport),
    dstport: Number(dstport),
    protocol: {
      protocol: isNaN(protocol)
        ? protocol === 'T'
          ? 'TCP'
          : 'UDP'
        : iana[protocol] || (protocol === '6' ? 'TCP' : 'UDP'),
      protocolCode,
    },
    bytes: Number(bytes_sent),
    action,
    tcpFlags: getTcpFlags(flow_state, swapped),
  })
}

function getTcpFlags(flow_state, swapped = false) {
  switch (flow_state) {
    case 'B':
      return swapped ? 18 : 2
    case 'C':
      return 0
    case 'E':
      return 1
  }
  return 0
}

function dateToProtoTimestamp(date) {
  const timeStamp = new Timestamp()
  timeStamp.fromDate(date)
  return timeStamp.toObject()
}

module.exports = {
  flowCategoryInfo,
  ParseFlows,
}
