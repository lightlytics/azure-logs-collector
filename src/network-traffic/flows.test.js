const NSG = require('../../mocks/NSG.json')
const VNet = require('../../mocks/VNET.json')
const SingleLog = require('../../mocks/single-vnet.json')
const { ParseFlows } = require('./flows')

test('NSG flow logs resource id', () => {
  const result = ParseFlows(NSG)

  expect(result.deviceId).toBe('azure_network_security_group')
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

  expect(result.logs).toHaveLength(38)
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
