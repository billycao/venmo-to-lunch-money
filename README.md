# Venmo to Lunch Money

An Express.js based app that transforms Venmo emails into [Lunch Money](lunch-money) transactions.

:warning: **This script is not yet publish-quality yet.**

This just the result of one evening hack session. Several tasks remain before
it is ready for prime time. I've made this available in case it's useful to
anyone else looking to include Venmo transactions in Lunch Money.
**Use at your own risk.**

## Table of Contents

- [Background](#Background)
- [Installation](#installation)
- [Usage](#usage)

## Background

### How it works

![Data Flow](docs/img/data-flow-diagram.png)

1. Venmo sends email to you.
2. You send email to your server, running [mailin](mailin).
3. Mailin sends a JSON object to **venmo-to-lunch-money**.
4. venmo-to-lunch-money creates a Lunch Money transaction.

## Installation

### Set up mailin.

To use **venmo-to-lunch-money**, you need to set up a server that can receive
emails and run [mailin](mailin). This is non-trivial and out of the scope of this
README, but the documentation in the mailin link is pretty bomb.

After you have your server set up and ready to accept emails, you can run mailin
with a command like

```
mailin --webhook http://localhost:3001/incoming-emails --disable-spam-score
```

This will instruct mailin to convert emails to JSON objects and POST them to your locally running venmo-to-lunch-money
instance.

:information_source: I'd recommend creating a service to run mailin at startup.

### Set up venmo-to-lunch-money

1. Clone the repo:
```
git clone git@github.com:billycao/venmo-to-lunch-money.git
```

2. Add your Lunch Money API Token to `/config/default.yml`.
```yaml
lunch-money:
  api-token: '1234567890123456789013245678901213457890'
```

3. Start venmo-to-lunch-money.
```
cd venmo-to-lunch-money
npm install
npm start
```

## Configuration

Additonal configuration settings like notes on transactions, currency, etc. can
be found in `config/default.yml`. System regexes and selectors for email parsing
can also be found there, so if Venmo changes their email format and something breaks,
that would be the first place to look.

## Contribution

I made this as just a 2-day hack. I'll try to maintain it for my own use but
have few cycles to contribute.

If you'd like to take over, please feel free to fork it and post on the Lunch Money slack community (avialable to all Lunch
Money subscribers).

I'll try to remain responsive to all issues and PRs, and you can reach me at
[the.billy.c@gmail.com](mailto:the.billy.c@gmail.com).

[lunch-money]: https://lunchmoney.app/
[mailin]: https://www.npmjs.com/package/mailin
