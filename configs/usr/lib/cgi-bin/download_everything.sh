#!/bin/bash

set -e

SERIAL=$(cat "/var/lib/wirenboard/short_sn.conf")
printf -v date '%(%Y%m%d_%H%M)T' -1

echo "Status: 200"
echo "Content-Disposition: attachment; filename=\"everything_${SERIAL}_${date}.tar.gz\""
echo "Content-Type: application/octet-stream"
echo ""
cd "$MOUNT_DIR"
sudo tar --one-file-system -cf - / /mnt/data | pigz
