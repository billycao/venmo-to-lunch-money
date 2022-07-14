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
    let emailDate = '2022-07-09T07:00:00.000Z';

    let emailObj = {
      'headers': {
        'subject': 'You paid Rahul Gupta-Iwasaki $2.49'
      },
      'date': emailDate,
      'html': emailHTML
    };

    let venmoEmail = new VenmoEmail(emailObj);
    let draftTransaction = venmoEmail.getDraftTransaction();

    console.log(draftTransaction);

    assert.equal(draftTransaction.venmoPaymentID, '3578806278201171470');
    assert.equal(draftTransaction.date, emailDate);
    assert.equal(draftTransaction.amount, '2.49');
    assert(draftTransaction.payee.includes('Rahul Gupta-Iwasaki'));
    assert(draftTransaction.payee.includes('Poker'));
  });
});
