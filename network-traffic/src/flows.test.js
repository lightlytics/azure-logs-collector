const NSG = require('../mocks/NSG.json')
const VNet = require('../mocks/VNET.json')
const SingleLog = require('../mocks/single-vnet.json')
const TcpHandshake = require('../mocks/tcp-handshake.json')
const TcpFin = require('../mocks/tcp-fin.json')
const UdpVNet = require('../mocks/udp-vnet.json')
const UdpNSG = require('../mocks/udp-nsg.json')
const { ParseFlows } = require('./flows')
const { FlowLogsDeviceTypeEnum } = require('./models/protobuf/proto')

test('NSG flow logs device type', () => {
  const result = ParseFlows(NSG)

  expect(result.deviceId).toBe('azure_network_security_group')
  expect(result.deviceType).toBe(FlowLogsDeviceTypeEnum.values.AZURE_FLOW_LOGS)
})

test('VNET flow logs device type', () => {
  const result = ParseFlows(VNet)

  expect(result.deviceId).toBe('azure_virtual_network')
  expect(result.deviceType).toBe(FlowLogsDeviceTypeEnum.values.AZURE_FLOW_LOGS)
})

test('NSG flow logs should have all elements', () => {
  const result = ParseFlows(NSG)

  expect(result.logs).toHaveLength(14)
  expect(result.vpcId).toBe('')
})

test('VNet flow logs resource id', () => {
  const resourceId =
    '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.Network/virtualNetworks/myVNet'

  const result = ParseFlows(VNet)

  expect(result.vpcId).toBe(resourceId)
})

test('VNET flow logs should have all elements', () => {
  const result = ParseFlows(VNet)

  expect(result.logs).toHaveLength(24)
})

test('Log should be duplicated and swapped src & dst', () => {
  const result = ParseFlows(SingleLog)

  expect(result.logs).toHaveLength(2)

  expect(result.logs[0].srcaddr).toBe(result.logs[1].dstaddr)
  expect(result.logs[0].dstaddr).toBe(result.logs[1].srcaddr)
  expect(result.logs[0].srcport).toBe(result.logs[1].dstport)
  expect(result.logs[0].dstport).toBe(result.logs[1].srcport)
  expect(result.logs[0].bytes_sent).toBe(result.logs[1].bytes_received)
  expect(result.logs[0].bytes_received).toBe(result.logs[1].bytes_sent)
})

test('VNet flow logs account id', () => {
  const result = ParseFlows(VNet)

  expect(result.accountIdString).toBe('00000000-0000-0000-0000-000000000000')
})

test('NSG flow logs account id', () => {
  const result = ParseFlows(NSG)

  expect(result.accountIdString).toBe('00000000-0000-0000-0000-000000000000')
})

test('TCP flags: TCP traffic with state B should have SYN and SYN-ACK', () => {
  // Azure flow logs aggregate bidirectional traffic
  // For TCP handshake (state B):
  // - Original direction (initiator) should have SYN (2)
  // - Swapped direction (responder) should have SYN-ACK (18)
  const result = ParseFlows(TcpHandshake)

  expect(result.logs).toHaveLength(2)

  const originalLog = result.logs.find(
    log => log.srcaddr === '10.0.0.6' && log.dstaddr === '40.74.146.17',
  )
  const swappedLog = result.logs.find(
    log => log.srcaddr === '40.74.146.17' && log.dstaddr === '10.0.0.6',
  )

  expect(originalLog.tcpFlags).toBe(2) // SYN
  expect(swappedLog.tcpFlags).toBe(18) // SYN-ACK
})

test('TCP flags: UDP traffic should never have TCP flags', () => {
  const result = ParseFlows(UdpVNet)

  expect(result.logs).toHaveLength(2)

  // Both logs should have protocol UDP with no TCP flags
  expect(result.logs[0].protocol.protocol).toBe('UDP')
  expect(result.logs[1].protocol.protocol).toBe('UDP')
  expect(result.logs[0].tcpFlags).toBe(0)
  expect(result.logs[1].tcpFlags).toBe(0)
})

test('TCP flags: NSG UDP traffic should not have TCP flags', () => {
  const result = ParseFlows(UdpNSG)

  expect(result.logs).toHaveLength(1)
  expect(result.logs[0].protocol.protocol).toBe('UDP')
  expect(result.logs[0].tcpFlags).toBe(0)
})

test('TCP flags: state E (FIN) should be symmetric for TCP', () => {
  const result = ParseFlows(TcpFin)

  expect(result.logs).toHaveLength(2)

  // Both directions should have FIN flag (1)
  expect(result.logs[0].tcpFlags).toBe(1)
  expect(result.logs[1].tcpFlags).toBe(1)
})


