#!/usr/bin/env bash

set -e

run_pigz() {
	# if there are more than 1 core, use half of them
	cpu_cores=$(nproc --all)
	if [ $cpu_cores -gt 1 ]; then
    		pigz -p $(($cpu_cores/2))
	else
    		pigz
	fi
}

SERIAL=$(cat "/var/lib/wirenboard/short_sn.conf")
printf -v date '%(%Y%m%d_%H%M)T' -1

echo "Status: 200"
echo "Content-Disposition: attachment; filename=\"configs_${SERIAL}_${date}.tar.gz\""
echo "Content-Type: application/octet-stream"
echo ""
cd "$MOUNT_DIR"
sudo tar --exclude='/var/tmp' --exclude='/var/log' -cf - \
	/etc /mnt/data/etc /var /mnt/data/root/zigbee2mqtt/data /mnt/data/makesimple/.SprutHub | run_pigz
