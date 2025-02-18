const protobuf = require('protobufjs')
const protoFilePath = './src/models/protobuf/collection.proto'

let pbRoot
let IAMLogsBatchProto
let IAMLogProto

function loadProtobuf() {
  if (!pbRoot) {
    pbRoot = protobuf.loadSync(protoFilePath)
    IAMLogsBatchProto = pbRoot.lookupType('collection.IAMLogsBatch')
    IAMLogProto = pbRoot.lookupType('collection.IAMLog')
  }
}

loadProtobuf()

module.exports = {
  IAMLogsBatchProto,
  IAMLogProto,
}