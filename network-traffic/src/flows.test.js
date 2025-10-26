const NSG = require('../mocks/NSG.json')
const VNet = require('../mocks/VNET.json')
const SingleLog = require('../mocks/single-vnet.json')
const TcpHandshake = require('../mocks/tcp-handshake.json')
const TcpFin = require('../mocks/tcp-fin.json')
const UdpVNet = require('../mocks/udp-vnet.json')
const UdpNSG = require('../mocks/udp-nsg.json')
const TcpInboundSsh = require('../mocks/tcp-inbound-ssh.json')
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

  // IP addresses and ports should be swapped
  expect(result.logs[0].srcaddr).toBe(result.logs[1].dstaddr)
  expect(result.logs[0].dstaddr).toBe(result.logs[1].srcaddr)
  expect(result.logs[0].srcport).toBe(result.logs[1].dstport)
  expect(result.logs[0].dstport).toBe(result.logs[1].srcport)

  // Bytes and packets should be swapped (original's sent = swapped's received)
  // Original tuple: 1663146003606,10.0.0.6,52.239.184.180,23956,443,6,O,E,NX,3,767,2,1580
  // packets_sent=3, bytes_sent=767, packets_received=2, bytes_received=1580
  expect(result.logs[0].bytes).toBe(1580) // bytes_received becomes bytes_sent for swapped log
  expect(result.logs[1].bytes).toBe(767)  // bytes_sent for original log
  expect(result.logs[0].packets).toBe(2)  // packets_received becomes packets_sent for swapped log
  expect(result.logs[1].packets).toBe(3)  // packets_sent for original log
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

test('SSH connection attempt from external IP should generate single log with SYN flag', () => {
  // Tuple: 1758553154914,121.229.59.68,10.2.0.4,51374,22,6,I,B,NX,0,0,0,0
  // Real meaning: External IP (121.229.59.68) attempting SSH to Azure VM (10.2.0.4:22)
  // Port 51374 (ephemeral) = client, Port 22 (SSH) = server
  // Direction I (Inbound) = arriving at 10.2.0.4's interface
  // Since bytes_received is 0, only one log should be generated (no swap)
  const result = ParseFlows(TcpInboundSsh)

  expect(result.logs).toHaveLength(1)

  const log = result.logs[0]

  // Verify source and destination
  expect(log.srcaddr).toBe('121.229.59.68') // External attacker/client
  expect(log.dstaddr).toBe('10.2.0.4') // Azure VM (SSH server)
  expect(log.srcport).toBe(51374) // Ephemeral client port
  expect(log.dstport).toBe(22) // SSH server port

  // Verify protocol
  expect(log.protocol.protocol).toBe('TCP')
  expect(log.protocol.protocolCode).toBe(6)

  // Verify TCP flags - state B (Begin) without swap should have SYN (2)
  // This is the initial SYN from the client attempting to connect
  expect(log.tcpFlags).toBe(2)

  // Verify bytes and packets (0 = no data transferred, connection may have been blocked/rejected)
  expect(log.bytes).toBe(0)
  expect(log.packets).toBe(0)

  // Verify timestamp (1758553154914 ms)
  const expectedDate = new Date(1758553154914)
  expect(log.start.seconds).toBe(Math.floor(expectedDate.getTime() / 1000))
})



