const config = require('config');
const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const htmlParser = require('node-html-parser');
const LunchMoney = require('lunch-money').default;

const app = express();

const lunchMoney = new LunchMoney({ token: config.get('lunch-money.api-token') });

// app.post('/incoming-emails', (req, res, next) => {
//   const form = formidable();
// 
//   form.parse(req, (err, fields, files) => {
//     if (err) {
//       next(err);
//       return;
//     }
//     emailTxt = fields['mailinMsg'];
//     emailJSON = JSON.parse(emailTxt);
// 
//     fs.writeFileSync('email.txt', JSON.stringify(emailJSON));
// 
//     res.end();
//   });
// });
// 
// const port = 3001
// app.listen(port);

let emailTxt = fs.readFileSync('email.txt', 'utf8');
let emailJSON = JSON.parse(emailTxt);
parseVenmoEmail(emailJSON);

function parseVenmoEmail(emailJSON) {
  let id = emailJSON['html'].match(/Payment\ ID:\ (?<id>\d+)/)['groups']['id'];
  let date = emailJSON['date'];

  let htmlRoot = htmlParser.parse(emailJSON['html']);
  let memo = htmlRoot.querySelectorAll('table > tbody > tr:first-child > td:nth-child(2) > div:nth-child(2) > p')[0].text;

  let subject = emailJSON['headers']['subject'];
  subject = 'Patrick Chu paid you $5.00';
  let payee = '';
  let amount = '';
  let match = null;
  let sign = ''
  if (subject.includes('You paid')) {
    // "You paid Jane Doe $5.00"
    match = subject.match(/You\ paid (?<recipient>.+)\ \$(?<amount>.+)/);
  } else if (subject.includes('You completed')) {
    // "You completed Jane Doe's $28.00 charge request"
    match = subject.match(/You\ completed (?<recipient>.+)'s\ \$(?<amount>.+)\ c.+/);
  } else if (subject.includes('paid your')) {
    // "Jane Doe paid your $47.20 request"
    match = subject.match(/(?<recipient>.+)\ paid\ your\ \$(?<amount>.+)\ request/);
    sign = '-';
  } else if (subject.includes('paid you')) {
    // "Jane Doe paid you $5.00"
    match = subject.match(/(?<recipient>.+)\ paid\ you\ \$(?<amount>.+)/);
    sign = '-';
  } else {
    console.error(`Invalid subject: ${subject}. Skipping transaction creation.`);
    return;
  }
  payee = match['groups']['recipient'];
  amount = sign + match['groups']['amount'];

  recordVenmoPayment(id, date, payee + ' - ' + memo, amount);
}

function recordVenmoPayment(id, date, payee, amount) {
  draftTransaction = {
    external_id: id,
    date: date,
    payee: payee,
    amount: amount,
    currency: 'usd',
    notes: '',
    status: 'uncleared'
  };
  console.log('Sending transaction to Lunch Money:');
  console.log(draftTransaction);
  lunchMoney.createTransactions({
    transactions: [draftTransaction],
    applyRules: false,
    checkForRecurring: false,
    debitAsNegative: false
  })
  .then(
    (res) => { console.log(res) },
    (err) => { console.error(err) });
}

