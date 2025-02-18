const protobuf = require('protobufjs')
const protoFilePath = './network-traffic/src/models/protobuf/collection.proto'

let pbRoot
let flowLogsBatchProto
let FlowLogsDeviceTypeEnum

const loadProtobuf = () => {
  if (!pbRoot) {
    pbRoot = protobuf.loadSync(protoFilePath)
    flowLogsBatchProto = pbRoot.lookupType('collection.VpcFlowLogs')
    flowLogsMsgProto = pbRoot.lookupType('collection.VpcFlowLog')
    FlowLogsDeviceTypeEnum = pbRoot.lookupEnum('collection.FlowLogsDeviceType')
    FlowLogActionEnum = pbRoot.lookupEnum('collection.FlowLogAction')
  }

  return {
    flowLogsBatchProto,
    FlowLogsDeviceTypeEnum,
  }
}

loadProtobuf()

module.exports = {
  flowLogsBatchProto,
  flowLogsMsgProto,
  FlowLogsDeviceTypeEnum,
  FlowLogActionEnum,
}
