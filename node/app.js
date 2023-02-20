const config = require('config');
const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

const keyFileStorage = require('key-file-storage').default(
  path.join(__dirname, 'bin'));
const LunchMoney = require('lunch-money').default;
const NodeCache = require('node-cache');

const VenmoEmail = require('./venmo-lib');

const app = express();

const apiToken = process.env.API_TOKEN || config.get('lunch-money.api-token')
const lunchMoney = new LunchMoney({ token: apiToken });

const lmCache = new NodeCache();


// Sends transaction unless transaction is duplicate.
function sendTransaction(draftTransaction) {
  if (!config.get('lunch-money.dryrun')) {
    const isDuplicate = kfs[draftTransaction.venmoPaymentID];
    if (isDuplicate) {
      console.log(`Duplicate transaction ${draftTransaction.venmoPaymentID}. Skipping...`);
      return;
    }

    lunchMoney.createTransactions(
      [draftTransaction],
      config.get('venmo-email.apply-rules'),
      config.get('venmo-email.check-for-recurring'),
      false  // debitAsNegative
    )
    .then(
      (res) => {
        id = res.ids[0];
        console.log(`Successfully created transaction ID ${id}`);
        kfs[draftTransaction.venmoPaymentID] = true;
      },
      (err) => { console.error(err) }
    );
  } else {
    console.log('dryrun == true, disabling send.');
  }
}

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
