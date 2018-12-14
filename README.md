# Open Data Portal Russia dataset 7707329152-snr downloader

Downloads [7707329152-snr](https://data.gov.ru/opendata/7707329152-snr) dataset from [Open Data Portal Russia](https://data.gov.ru) and populates it into AWS DynamoDB

## Usage

```bash
# Download and populate dataset
npm run download

# Start local API server
npm start
```

> By default local configuration is used, be sure to run AWS DynamoDB locally. Setup instructions: [DynamoDB (Downloadable Version) on Your Computer](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html)
