#!/usr/bin/env bash

CONFFILE="/etc/wb-webui.conf"

[ -f "$CONFFILE" ] && exit 0

. /usr/lib/wb-utils/wb_env.sh

wb_source "of"

if of_machine_match "wirenboard,wirenboard-85x"; then
    CONF_SUFFIX="wb85"
elif of_machine_match "wirenboard,wirenboard-8xx"; then
    CONF_SUFFIX="wb8"
elif of_machine_match "wirenboard,wirenboard-74x"; then
    CONF_SUFFIX="wb74"
elif of_machine_match "wirenboard,wirenboard-720"; then
    CONF_SUFFIX="wb7"
elif of_machine_match "contactless,imx6ul-wirenboard60"; then
    CONF_SUFFIX="wb6"
elif of_machine_match "contactless,imx28-wirenboard50"; then
    CONF_SUFFIX="wb5"
else
    CONF_SUFFIX="default"
fi
BOARD_CONF="/usr/share/wb-mqtt-homeui/config.${CONF_SUFFIX}.json"

cp "$BOARD_CONF" "$CONFFILE"
