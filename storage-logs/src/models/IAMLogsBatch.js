class IAMLogsBatch {
  constructor(iamLogsSerializedBatch, accountId, recordCount) {
    return {
      logs: iamLogsSerializedBatch,
      recordCount,
      accountId,
      isCompressed: true
    }
  }
}

module.exports = {
  IAMLogsBatch,
}
