#!/bin/bash

CHECK_SERVER="http://probe.wirenboard.com"

send_output() {
    echo "Status: $1"
    echo "Content-type: text/plain"
    echo ""
    echo "$2"
}

jq -e '.probeOpenPorts==true' /etc/wb-security.conf  >/dev/null || {
    mosquitto_pub -d -p 1883 -t "/rpc/v1/exp-check" -r -m '{"result": "not found"}' 2>&1
    send_output 200 "Check disabled in config"
    exit 0
}


SERIAL=$(cat "/var/lib/wirenboard/short_sn.conf")
URL="${HTTP_SCHEME}://${HTTP_HOST}/"

data=$(curl --connect-timeout 120 --max-time 120 --silent --show-error --fail -X POST -o /dev/stdout -d "serial=${SERIAL}&url=${URL}" "${CHECK_SERVER}/probe/")
if [ $? -ne 0 ]; then
    send_output 503 "Failed to get response from upstream"
    exit 0
fi

result=$(echo "$data" | jq -r '.result')
if [ "$result" == "cooldown" ]; then
    send_output 200 "Cooldown"
    exit 0
else
    mosquitto_pub -d -p 1883 -t "/rpc/v1/exp-check" -m "$data" -r 2>&1
    send_output 200 "OK"
    exit 0
fi
