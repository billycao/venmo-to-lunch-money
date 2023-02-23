const config = require('config');
const htmlParser = require('node-html-parser');

import { ParsedMail } from 'mailparser';
import { Tag, DraftTransaction } from 'lunch-money';

export type VenmoEmailOptions = {
  addNote: boolean;
  defaultCurrency: string;
  defaultState: DraftTransaction["status"];
  memoCSSSelector: string;
  tags: string[];

  dateRegex: RegExp;
  idRegex: RegExp;
  subjectDebitRegexes: RegExp[];
  subjectCreditRegexes: RegExp[];
}

class VenmoEmail {
  email: ParsedMail;
  options: VenmoEmailOptions;

  constructor(email: ParsedMail, options: VenmoEmailOptions) {
    this.email = email;
    this.options = options;
  }

  getPayeeAndAmountFromSubject() {
    let subject = this.email.subject;
    for (let regex of this.options.subjectDebitRegexes) {
      let match = subject.match(regex);
      if (match) {
        return [match['groups']['payee'], match['groups']['amount']];
      }
    }
    for (let regex of this.options.subjectCreditRegexes) {
      let match = subject.match(regex);
      if (match) {
        return [match['groups']['payee'], '-' + match['groups']['amount']];
      }
    }
    return [null, null];
  }

  getPaymentID(): string | 'Unknown' {
    let idMatch = this.email.text.match(this.options.idRegex);
    if (idMatch) {
      if ('groups' in idMatch && 'id' in idMatch['groups']) {
        return idMatch['groups']['id'];
      }
      console.error('Missing named capture group "id". Is id-regex formatted correctly?');
      return 'Unknown';
    }
    return 'Unknown';
  }

  getPaymentDateAsISOString(): string {
    let dateMatch = this.email.text.match(this.options.dateRegex);
    if (dateMatch) {
      let dateObj = new Date(Date.parse(dateMatch['groups']['date']));
      dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
      return dateObj.toISOString();
    }
    console.warn('Could not extract payment date from email body. Falling back to email date.');
    return this.email.date.toISOString();
  }

  getPaymentMemo() {
    let htmlRoot = htmlParser.parse(this.email.text);
    let memoElems = htmlRoot.querySelectorAll(this.options.memoCSSSelector);
    if (!memoElems.length) {
      console.error('Could not extract memo from email. Is memo-css-selector correct?');
      return
    }
    return memoElems[0].text;
  }

  getDraftTransaction(): DraftTransaction {
    let subject = this.email.subject;
    let [payee, amount] = this.getPayeeAndAmountFromSubject();
    if (!(payee && amount)) {
      console.warn(`Unrecognized email subject: ${subject}`);
      return;
    }
    // Remove commas for amounts like 1,000
    amount = amount.replaceAll(',', '');

    let date = this.getPaymentDateAsISOString();
    if (!date) {
      console.warn('Could not get date from email.');
    }
    let memo = this.getPaymentMemo();
    if (!memo) {
      console.warn('Could not get transaction memo from email.');
    }

    let note = '';
    if (this.options.addNote) {
      note = `VenmoID ${this.getPaymentID()}`;
    }

    return {
      date: date,
      payee: payee + ' - ' + memo,
      amount: amount,
      currency: this.options.defaultCurrency,
      notes: note,
      status: this.options.defaultState,
      // tags: this.options.tags
    };
  }


}

module.exports = VenmoEmail;
