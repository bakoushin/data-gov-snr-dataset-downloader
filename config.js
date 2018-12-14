require('dotenv').config();

module.exports = {
  data_gov: {
    token: process.env.DATA_GOV_ACCESS_TOKEN,
    dataset: '7707329152-snr'
  },
  aws_table_name: process.env.AWS_TABLE_NAME,
  aws_remote_config: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    region: process.env.AWS_REGION
  },
  aws_local_config: {
    region: 'local',
    endpoint: 'http://localhost:8000'
  },
  data_dir: './.data',
  data_filename: 'data.zip',
  port: process.env.PORT || 3000
};
