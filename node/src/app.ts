export {};

const config = require('config');
const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || __dirname;
const keyFileStorage = require('key-file-storage').default(dataDir);
const LunchMoney = require('lunch-money').default;
const NodeCache = require('node-cache');
const simpleParser = require('mailparser').simpleParser;
const SMTPServer = require("smtp-server").SMTPServer;

const VenmoEmail = require('./venmo-lib');

const app = express();

const apiToken = process.env.API_TOKEN || config.get('lunch-money.api-token')
const lunchMoney = new LunchMoney({ token: apiToken });

const lmCache = new NodeCache();

import { Tag, DraftTransaction } from 'lunch-money';
import { ParsedMail } from 'mailparser';
import { VenmoEmailOptions } from './venmo-lib';

export function getOptionsFromConfig(): VenmoEmailOptions {
  // Fetch and validate venmo-email config options.
  let venmoEmailOptions: VenmoEmailOptions = {
    addNote: config.get('venmo-email.add-note'),
    defaultCurrency: config.get('venmo-email.currency'),
    defaultState: config.get('venmo-email.state'),
    memoCSSSelector: config.get('venmo-email.memo-css-selector'),
    tags: config.get('lunch-money.include-tags'),

    dateRegex: new RegExp(config.get('venmo-email.date-regex')),
    idRegex: new RegExp(config.get('venmo-email.id-regex')),
    subjectDebitRegexes: [] as RegExp[],
    subjectCreditRegexes: [] as RegExp[],
  }
  for (let regexStr of config.get('venmo-email.subject-debit-regexes')) {
    venmoEmailOptions.subjectDebitRegexes.push(new RegExp(regexStr));
  }
  for (let regexStr of config.get('venmo-email.subject-credit-regexes')) {
    venmoEmailOptions.subjectCreditRegexes.push(new RegExp(regexStr));
  }

  return venmoEmailOptions;
}

// Sends transaction to Lunch Money unless transaction is duplicate.
function sendTransaction(venmoID: number, draftTransaction: DraftTransaction): void {
  lunchMoney.createTransactions(
    [draftTransaction],
    config.get('venmo-email.apply-rules'),
    config.get('venmo-email.check-for-recurring'),
    false  // debitAsNegative
  )
  .then(
    (res: any) => {
      let id = res.ids[0];
      console.log(`Successfully created transaction ID ${id}`);
      keyFileStorage[venmoID] = true;
    },
    (err: any) => { console.error(err) }
  );
}

function processEmail(email: ParsedMail): void {
  // Log email to file.
  let logdir = config.get('logging.logdir');
  if (logdir) {
    if (fs.existsSync(logdir)) {
      let logfile = path.join(logdir, email.subject + '.txt');
      fs.writeFile(logfile, JSON.stringify(email), (err: any)  => {
        if (err) {
          console.error('Error logging email to file:', err);
        }
      });
    }
  }

  let venmoEmail = new VenmoEmail(email, getOptionsFromConfig());
  if (config.get('lunch-money.dryrun')) {
    console.warn('dryrun == true, skipping send.');
    return;
  }

  const venmoID = venmoEmail.getPaymentID();
  if (venmoID == 'Unknown') {
    console.error('Could not get Venmo payment ID. Skipping...');
    return;
  }
  const isDuplicate = keyFileStorage[venmoID];
  if (isDuplicate) {
    console.warn(`Duplicate transaction ID ${venmoID}. Skipping...`);
    return;
  }

  const draftTransaction = venmoEmail.getDraftTransaction();
  if (draftTransaction) {
    console.log('Sending transaction to Lunch Money:');
    console.log(draftTransaction);
    sendTransaction(venmoID, draftTransaction);
  } else {
    console.error('Could not create draftTransaction from email. Skipping...');
  }
}

const server = new SMTPServer({
  secure: false,
  authOptional: true,
  onData(stream: any, session: any, callback: any) {
    simpleParser(stream, {})
        .then((parsed: ParsedMail) => processEmail(parsed))
        .catch((err: Error) => console.log(err));
    stream.on('end', callback);
  }
});

if (require.main == module) {
  let smtpPort = config.get('smtp-server.listen-port') || 25;
  console.log(`SMTP server listening for Venmo emails on port ${smtpPort}`);
  server.listen(smtpPort);
}
