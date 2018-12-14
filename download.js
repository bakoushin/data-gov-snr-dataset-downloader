const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const yauzl = require('yauzl');
const camaro = require('camaro');
const AWS = require('aws-sdk');
const config = require('./config');

const mkdir = promisify(fs.mkdir);

AWS.config.update(config.aws_local_config);
const db = new AWS.DynamoDB.DocumentClient();
db.batchWrite = promisify(db.batchWrite);

const datasetUrl = `http://data.gov.ru/api/json/dataset/${
  config.data_gov.dataset
}`;

const token = config.data_gov.token;

console.log('Getting dataset from server');
// Get latest dataset url
fetch(`${datasetUrl}/version?access_token=${token}`)
  .then(res => res.json())
  .then(([data]) => {
    const version = data.created;
    console.log(`Actual dataset verison ${version}`);
    return fetch(`${datasetUrl}/version/${version}?access_token=${token}`);
  })
  .then(res => res.json())
  .then(([data]) => {
    console.log(`Downloading ${data.source}`);
    return fetch(data.source);
  })
  // Create data directory
  .then(res => {
    return mkdir(config.data_dir)
      .catch(err => {
        if (err.code != 'EEXIST') throw err;
      })
      .then(() => {
        return res;
      });
  })
  // Download dataset
  .then(res => {
    return new Promise((resolve, reject) => {
      console.log(`Download started`);
      const filename = path.resolve(config.data_dir, config.data_filename);
      const dest = fs.createWriteStream(filename);
      const writableStream = res.body.pipe(dest);
      writableStream.on('finish', () => {
        console.log(`Download finished`);
        resolve(filename);
      });
      writableStream.on('error', err => {
        reject(err);
      });
    });
  })
  // Parse dataset and populate DynamoDB table
  .then(filename => {
    return new Promise((resolve, reject) => {
      yauzl.open(filename, { lazyEntries: true }, (err, zipfile) => {
        if (err) reject(err);
        zipfile.readEntry();
        zipfile.on('entry', entry => {
          console.log(entry.fileName);
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) reject(err);
            const chunks = [];
            readStream.on('data', chunk => chunks.push(chunk));
            readStream.on('end', async () => {
              try {
                const xml = Buffer.concat(chunks).toString();
                const { items } = camaro(xml, {
                  items: [
                    '//Документ',
                    {
                      inn: 'СведНП/@ИННЮЛ',
                      name: 'СведНП/@НаимОрг',
                      USN: 'СведСНР/@ПризнУСН',
                      ENVD: 'СведСНР/@ПризнЕНВД',
                      ESHN: 'СведСНР/@ПризнЕСХН',
                      SRP: 'СведСНР/@ПризнСРП'
                    }
                  ]
                });

                const tasks = items
                  // Cast boolean values
                  .map(item => {
                    item.USN = item.USN === '1' ? true : false;
                    item.ENVD = item.ENVD === '1' ? true : false;
                    item.ESHN = item.ESHN === '1' ? true : false;
                    item.SRP = item.SRP === '1' ? true : false;
                    return item;
                  })
                  // Split all items to batches of 25 items
                  .reduce(
                    (tasks, item) => {
                      let lastBatch = tasks[tasks.length - 1];
                      if (lastBatch.length === 25) {
                        lastBatch = [];
                        tasks.push(lastBatch);
                      }
                      lastBatch.push(item);
                      return tasks;
                    },
                    [[]]
                  )
                  // Write batch into DynamoDB
                  .map(batch => {
                    const items = batch.map(item => {
                      return {
                        PutRequest: {
                          Item: item
                        }
                      };
                    });

                    return db.batchWrite({
                      RequestItems: {
                        [config.aws_table_name]: items
                      }
                    });
                  });

                await Promise.all(tasks);

                console.log(`Added ${items.length} items`);

                zipfile.readEntry();
              } catch (err) {
                reject(err);
              }
            });
          });
        });
        zipfile.on('close', () => resolve());
      });
    });
  })
  .then(() => console.log('Finished'))
  .catch(err => console.error(err));
