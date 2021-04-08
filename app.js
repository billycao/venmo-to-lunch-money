const config = require('config');
const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const LunchMoney = require('lunch-money').default;
const VenmoEmail = require('./venmo-lib');

const app = express();

const lunchMoney = new LunchMoney({ token: config.get('lunch-money.api-token') });

function sendTransaction(draftTransaction) {
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

// We provide a GET endpoint to play nice with mailin.
httpEndpoint = config.get('express.http-endpoint');
app.get(httpEndpoint, (req, res) => {
  res.end();
});

app.post(httpEndpoint, (req, res, next) => {
  const form = formidable();

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Received invalid form contents. Skipping.');
      next(err);
      return;
    }

    if ('mailinMsg' in fields) {
      let venmoEmail = new VenmoEmail(JSON.parse(fields['mailinMsg']));
      draftTransaction = venmoEmail.getDraftTransaction();
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

const port = process.env.EXPRESS_PORT || config.get('express.default-http-port');
const host = config.get('express.http-host');
console.log(`Listening for new emails POSTed by mailin to http://${host}:${port}${httpEndpoint}`);
app.listen(port);
