const config = require('config');
const fs = require('fs');
const path = require('path');

const assert = require('assert').strict;
const expect = require('chai').expect;

const app = require('../built/app');
const VenmoEmail = require('../built/venmo-lib');

import { ParsedMail, HeaderValue, HeaderLines } from 'mailparser';

function getEmailFromTestdata(
  subject: string,
  date: string,
  emailBodyRelativePath: string): ParsedMail {
   let emailHTML = fs.readFileSync(
      path.join(__dirname, emailBodyRelativePath),
      {'encoding': 'utf-8'});
    let emailDate = new Date(date);

    return {
      'attachments': [],
      'headers': new Map<string, HeaderValue>(),
      'headerLines': [],
      'subject': subject,
      'date': emailDate,
      'html': emailHTML,
      'text': '',
    };
}

describe('VenmoEmail', function() {
  it('should parse sent money emails', function() {
    let email = getEmailFromTestdata(
      'You paid Jane Doe $10.00',
      '2023-02-12T16:29:00.000Z',
      '../testdata/venmo-send-money-email.txt');
    let venmoEmail = new VenmoEmail(email,  app.getOptionsFromConfig());
    let draftTransaction = venmoEmail.getDraftTransaction();

    assert.equal(venmoEmail.getPaymentID(), '3736958406176898632');
    assert.equal(draftTransaction.date, '2023-02-12T00:00:00.000Z');
    assert.equal(draftTransaction.amount, '10.00');
    expect(draftTransaction.payee).to.include('Jane Doe');
    expect(draftTransaction.payee).to.include('Gas for rental car');
  });

  it('should parse receive money emails', function() {
    let email = getEmailFromTestdata(
      'Bob Smith paid you $250.00',
      '2023-02-21T06:13:00.000Z',
      '../testdata/venmo-receive-money-email.txt');
    let venmoEmail = new VenmoEmail(email,  app.getOptionsFromConfig());
    let draftTransaction = venmoEmail.getDraftTransaction();

    assert.equal(venmoEmail.getPaymentID(), '3720437832885961799');
    assert.equal(draftTransaction.date, '2023-01-20T00:00:00.000Z');
    assert.equal(draftTransaction.amount, '-250.00');

    expect(draftTransaction.payee).to.include('Bob Smith');
    expect(draftTransaction.payee).to.include('Hotel');
  });
});
