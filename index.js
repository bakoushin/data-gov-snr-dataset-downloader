const { promisify } = require('util');
const express = require('express');
const AWS = require('aws-sdk');
const config = require('./config.js');

const app = express();

AWS.config.update(config.aws_local_config);
const db = new AWS.DynamoDB.DocumentClient();
db.get = promisify(db.get);

app.get('/api/v1/special_regimes/:inn', (req, res, next) => {
  const inn = req.params.inn;
  db.get({
    TableName: config.aws_table_name,
    Key: { inn }
  })
    .then(({ Item }) => {
      if (Item) res.json(Item);
      else res.status(404).end();
    })
    .catch(next);
});

app.all('*', (req, res, next) => {
  res.status(404).end();
});

app.use((err, req, res, next) => {
  res.status(500).end();
});

const port = config.port;

app.listen(port, () => console.log(`App is listnening on port ${port}`));
