const fs = require('fs')
const path = require('path')

const logV1 = fs.readFileSync(path.resolve(__dirname, '../mocks/storage-logs-v1.log'), 'utf8')
const logV2 = fs.readFileSync(path.resolve(__dirname, '../mocks/storage-logs-v2.log'), 'utf8')

const { ParseLogs } = require('./storageLogs')

test('Parsing storage logs in version 1', () => {
  const result = ParseLogs(logV1)

  expect(result.logs.length).toBeGreaterThan(0)
})

test('Parsing storage logs in version 2', () => {
  const result = ParseLogs(logV2)

  expect(result.logs.length).toBeGreaterThan(0)
})

test('logs have valid eventTime', () => {
  const result = ParseLogs(logV2)

  result.logs.forEach(log => {
    expect(log.eventTime).toBeTruthy()
  })
})