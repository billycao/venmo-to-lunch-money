const config = require('config');
const fs = require('fs');
const path = require('path');

const assert = require('assert').strict;

const app = require('../app');
const VenmoEmail = require('../venmo-lib');

// TODO(billy): Use generic testdata so tests can run on third party systems.

describe('VenmoEmail', function() {
  it('should parse sent money emails', function() {
    let emailHTML = fs.readFileSync(
      path.join(__dirname, '../testdata/venmo-send-money-email.txt'),
      {'encoding': 'utf-8'});
    let emailDate = '2023-02-12T16:29:00.000Z';

    let emailObj = {
      'headers': {
        'subject': 'You paid Angela Lau $10.00'
      },
      'date': emailDate,
      'html': emailHTML
    };

    let venmoEmail = new VenmoEmail(emailObj);
    let draftTransaction = venmoEmail.getDraftTransaction();

    console.log(draftTransaction);

    assert.equal(draftTransaction.venmoPaymentID, '3736958406176898632');
    assert.equal(draftTransaction.date, '2023-02-12T00:00:00.000Z');
    assert.equal(draftTransaction.amount, '10.00');
    assert(draftTransaction.payee.includes('Angela Lau'));
    assert(draftTransaction.payee.includes('Gas for rental car'));
  });
});
