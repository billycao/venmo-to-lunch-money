#!/bin/bash

cd "$(dirname "$0")"
mail -v -s "You paid Jane Doe \$10.00" -r sender@example.com nobody@localhost < ../testdata/venmo-send-money-email.txt
