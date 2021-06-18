const config = require('config');
const htmlParser = require('node-html-parser');
const replaceString = require('replace-string');

class VenmoEmail {
  emailJSON;

  dateRegex;
  idRegex;
  subjectDebitRegexes;
  subjectCreditRegexes;
  memoCSSSelector;

  defaultCurrency;
  defaultNote;
  defaultState;

  constructor(emailJSON) {
    this.emailJSON = emailJSON;
    // TODO(billycao): Validate POST or JSON contents.
    // TODO(billycao): Honestly we should just use Typescript for this...

    this.idRegex = new RegExp(config.get('venmo-email.id-regex'));
    this.dateRegex = new RegExp(config.get('venmo-email.date-regex'));

    this.subjectDebitRegexes = [];
    for (let regexStr of config.get('venmo-email.subject-debit-regexes')) {
      this.subjectDebitRegexes.push(new RegExp(regexStr));
    }
    this.subjectCreditRegexes = [];
    for (let regexStr of config.get('venmo-email.subject-credit-regexes')) {
      this.subjectCreditRegexes.push(new RegExp(regexStr));
    }

    this.memoCSSSelector = config.get('venmo-email.memo-css-selector');

    this.defaultCurrency = config.get('venmo-email.currency');
    this.defaultNote = config.get('venmo-email.note');
    this.defaultState = config.get('venmo-email.state');
  }

  getSubject() {
    return this.emailJSON['headers']['subject'];
  }

  getPayeeAndAmountFromSubject() {
    let subject = this.getSubject();
    for (let regex of this.subjectDebitRegexes) {
      let match = subject.match(regex);
      if (match) {
        return [match['groups']['payee'], match['groups']['amount']];
      }
    }
    for (let regex of this.subjectCreditRegexes) {
      let match = subject.match(regex);
      if (match) {
        return [match['groups']['payee'], '-' + match['groups']['amount']];
      }
    }
    return [null, null];
  }

  getPaymentID() {
    let idMatch = this.emailJSON['html'].match(this.idRegex);
    if (idMatch) {
      if ('groups' in idMatch && 'id' in idMatch['groups']) {
        return idMatch['groups']['id'];
      }
      console.error('Missing named capture group "id". Is id-regex formatted correctly?');
      return;
    }
    return;
  }

  getPaymentDateAsISOString() {
    let dateMatch = this.emailJSON['html'].match(this.dateRegex);
    if (dateMatch) {
      let dateObj = new Date(Date.parse(dateMatch['groups']['date']));
      return dateObj.toISOString();
    }
    console.warn('Could not extract payment date from email body. Falling back to email date.');
    return this.emailJSON['date'];
  }

  getPaymentMemo() {
    let htmlRoot = htmlParser.parse(this.emailJSON['html']);
    let memoElems = htmlRoot.querySelectorAll(this.memoCSSSelector);
    if (!memoElems.length) {
      console.error('Could not extract memo from email. Is memo-css-selector correct?');
      return
    }
    return memoElems[0].text;
  }

  getDraftTransaction() {
    let subject = this.getSubject();
    let [payee, amount] = this.getPayeeAndAmountFromSubject();
    if (!(payee && amount)) {
      console.log(`Unrecognized email subject: ${subject}`);
      return;
    }
    // Remove commas for amounts like 1,000
    amount = replaceString(amount, ',', '');

    let id = this.getPaymentID();
    let date = this.getPaymentDateAsISOString();
    let memo = this.getPaymentMemo();
    if  (!(id && date && memo)) return;

    return {
      external_id: id,
      date: date,
      payee: payee + ' - ' + memo,
      amount: amount,
      currency: this.defaultCurrency,
      notes: this.defaultNote,
      status: this.defaultState,
    };
  }


}

module.exports = VenmoEmail;
