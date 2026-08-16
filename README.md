# Azure Activity Logs Collector

Currently supported log types:

- [Network Traffic Logs](#network-traffic-collector-function)
- [Storage Logs](#azure-storage-analytics-logging)
- [File Collector](#file-collector)

### Network Traffic Collector Function

able to collect Flow logs from:

- [Network Security Group (NSG)](https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-nsg-flow-logging-overview)
- [Virtual Network (VNET)](https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-overview)

[<img src="https://aka.ms/deploytoazurebutton" alt="Deploy to Azure">](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Flightlytics%2Fazure-logs-collector%2Fmain%2Fnetwork_logs_arm_template.json)

### Azure Storage analytics logging

able to collect storage logs from:

- [Storage Accounts (blob containers)](https://learn.microsoft.com/en-us/azure/storage/common/storage-analytics-logging)

[<img src="https://aka.ms/deploytoazurebutton" alt="Deploy to Azure">](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Flightlytics%2Fazure-logs-collector%2Fmain%2Fstorage_logs_arm_template.json)

### File Collector

Able to collect and forward files from any blob container (for example, [GitHub audit logs](https://docs.github.com/en/enterprise-cloud@latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs-for-your-enterprise/streaming-the-audit-log-for-your-enterprise#setting-up-streaming-to-azure-blob-storage)) to the Stream Security API.

[<img src="https://aka.ms/deploytoazurebutton" alt="Deploy to Azure">](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Flightlytics%2Fazure-logs-collector%2Fmain%2Ffile_collector_arm_template.json)

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
- **API URL Suffix**
    - Suffix for the API endpoint, default is `github-audit`

## Releasing a new version

Releases are built and published automatically by the `Package Azure Function` GitHub Actions workflow — there is **no Jenkins job** for this repo. The workflow triggers on any tag push, builds all three collector zips (`npm install --omit=dev` on the Node version pinned in the workflow), creates the GitHub release, and attaches the zips as assets.

**Steps:**

1. In your PR, bump the version in all three `package.json` files (`network-traffic`, `storage-logs`, `file-collector`) and regenerate the lockfiles (`npm install --package-lock-only` in each), update `release_name` in `.github/workflows/package.yml`, and update the `packageUri` pins in the three `*_arm_template.json` files to the new version.
2. Merge the PR to `main`.
3. Create the tag on the merge commit — either:

   ```bash
   git fetch origin main && git tag <VERSION> origin/main && git push origin <VERSION>
   ```

   or without a clone:

   ```bash
   gh api repos/lightlytics/azure-logs-collector/git/refs \
     -f ref='refs/tags/<VERSION>' -f sha='<merge commit sha>'
   ```

4. Wait for the `Package Azure Function` workflow run to go green, then verify the assets exist:

   ```bash
   curl -sI -L https://github.com/lightlytics/azure-logs-collector/releases/download/<VERSION>/network-traffic-collector.zip
   ```

**⚠️ Do not create the release through the GitHub UI.** The UI creates the tag *and* a release together; the workflow then fires on the tag and fails trying to create its own release — leaving you with an empty release and no assets. Push only the bare tag and let the workflow create the release.

**Downstream:** after the release is published, update `WEBSITE_RUN_FROM_PACKAGE` in the [`terraform-streamsec-azure-tenant`](https://github.com/streamsec-terraform/terraform-streamsec-azure-tenant) flowlogs module to the new version's URL and cut a module release. The ARM templates in this repo pin their own `packageUri` (step 1).
