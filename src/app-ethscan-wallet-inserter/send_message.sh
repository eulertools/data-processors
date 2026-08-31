#!/bin/bash
message="{\"address\":\"$1\"}"
account_id=`aws sts get-caller-identity --query "Account" --output text`
topic=ethscan-wallet-insert
aws sns publish --topic-arn arn:aws:sns:$AWS_REGION:$account_id:$topic --message $message
