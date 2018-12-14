#!/bin/bash
# Init local DynamoDB database
aws dynamodb create-table --endpoint-url http://localhost:8000 \
    --table-name special_regimes \
    --attribute-definitions \
        AttributeName=inn,AttributeType=S \
    --key-schema AttributeName=inn,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1