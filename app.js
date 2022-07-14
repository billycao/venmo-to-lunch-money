const config = require('config');
const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const LunchMoney = require('lunch-money').default;
const NodeCache = require('node-cache');
const VenmoEmail = require('./venmo-lib');

const app = express();

// Add getTags() function to lunch-money API.
// TODO(billy): Add to lunch-money core package.
LunchMoney.prototype['getTags'] = async function() {
  return await lunchMoney.get('/v1/tags');
}

const lunchMoney = new LunchMoney({ token: config.get('lunch-money.api-token') });

const lmCache = new NodeCache();

function sendTransaction(draftTransaction) {
  if (!config.get('lunch-money.dry-run')) {
    lunchMoney.createTransactions(
      [draftTransaction],
      config.get('venmo-email.apply-rules'),
      config.get('venmo-email.check-for-recurring'),
      false  // debitAsNegative
    )
    .then(
      (res) => { console.log(res) },
      (err) => { console.error(err) }
    );
  }
}

// Return the Lunch Money Tag objects to add to transactions.
async function getTags() {
  configTags = config.get('lunch-money.include-tags');
  if (configTags.length == 0) return;

  txnTags = lmCache.get('txnTags');
  if (txnTags == undefined) {
    return new Promise((resolve, reject) => {
      lunchMoney.getTags().then(
        (res) => {
          tags = [];
          for (const tag of res) {
            if (configTags.includes(tag['name'])) {
              tags.push(tag);
            }
          }
          lmCache.set('txnTags', tags, 86400);
          resolve(tags);
        },
        (err) => {
          console.log('Could not fetch Lunch Money tags.');
          reject(err);
        }
      );
    });
  }
  return txnTags;
}
module.exports.getTags = getTags;

// We provide a GET endpoint to play nice with mailin.
httpEndpoint = config.get('express.http-endpoint');
app.get(httpEndpoint, (req, res) => {
  res.send('Listening for POSTed emails.');
  res.end();
});

app.post(httpEndpoint, (req, res, next) => {
  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Received invalid form contents. Skipping.');
      next(err);
      return;
    }

    if ('mailinMsg' in fields) {
      let emailObj = JSON.parse(fields['mailinMsg']);
      let emailSubject = emailObj['headers']['subject'];
      console.log(`Processing ${emailSubject}`);

      // Log email to file.
      let logdir = config.get('logging.logdir');
      if (logdir) {
        if (fs.existsSync(logdir)) {
          let logfile = path.join(logdir, subject + '.txt');
          fs.writeFile(logfile, emailObj['text'], err => {
            if (err) {
              console.error('Error logging email to file:', err);
            }
          });
        }
      }

      let venmoEmail = new VenmoEmail(emailObj);
      let draftTransaction = venmoEmail.getDraftTransaction();

      if (draftTransaction) {
        draftTransaction.tags = await getTags();

        console.log('Sending transaction to Lunch Money:');
        console.log(draftTransaction);
        sendTransaction(draftTransaction);
      } else {
        console.log('Could not create draftTransaction from email. Skipping...');
      }
    } else {
      console.error('field "mailinMsg" not found in form contents. Skipping.');
    }
    res.end();
  });
});

if (require.main == module) {
  const port = process.env.EXPRESS_PORT || config.get('express.default-http-port');
  const host = config.get('express.http-host');
  console.log(`Listening for new emails POSTed by mailin to http://${host}:${port}${httpEndpoint}`);
  app.listen(port);
}
