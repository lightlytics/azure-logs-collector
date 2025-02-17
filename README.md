# Azure Activity Logs Collector

Currently supported log types:

- [Network Traffic Logs](#network-traffic-collector-function)
- [Storage Logs](#azure-storage-analytics-logging)

### Network Traffic Collector Function

able to collect Flow logs from:

- [Network Security Group (NSG)](https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-nsg-flow-logging-overview)
- [Virtual Network (VNET)](https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-overview)

[<img src="https://aka.ms/deploytoazurebutton" alt="Deploy to Azure">](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Flightlytics%2Fazure-log-collectors%2Fmain%2Fnetwork_logs_arm_template.json)

### Azure Storage analytics logging

able to collect storage logs from:

- [Storage Accounts (blob containers)](https://learn.microsoft.com/en-us/azure/storage/common/storage-analytics-logging)

[<img src="https://aka.ms/deploytoazurebutton" alt="Deploy to Azure">](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Flightlytics%2Fazure-log-collectors%2Fmain%2Fstorage_logs_arm_template.json)

## Deployment

_Click the button below and provide the following parameters:_

- **Resource Group**
- **Region**
- **Stream Security Api Url**
    - API Url of your environment _(without a trailing slash)_, for example:
      `https://app.streamsec.io`
- **Stream Security Collection Token**
    - API token that can be obtained from Stream Security **_Integrations page_**
- **Storage Account Name**
    - name of the Storage Account that contains the container with targeted logs
- **Blob Container**
    - Blob container in a storage account that contains _Network Traffic logs_ / _Storage logs_
