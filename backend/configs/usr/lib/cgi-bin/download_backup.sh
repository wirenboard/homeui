#!/usr/bin/env bash

set -euo pipefail

run_pigz() {
    # if there are more than 1 core, use half of them
    cpu_cores=$(nproc --all)
    if [ "$cpu_cores" -gt 1 ]; then
        pigz -p $((cpu_cores / 2))
    else
        pigz
    fi
}

case "${WB_BACKUP_TYPE:-}" in
    rootfs|configs|everything)
        ;;
    *)
        echo "Status: 400"
        echo "Content-Type: text/plain"
        echo ""
        echo "Unknown backup type"
        exit 1
        ;;
esac

SERIAL=$(cat "/var/lib/wirenboard/short_sn.conf")
printf -v date '%(%Y%m%d_%H%M)T' -1

echo "Status: 200"
echo "Content-Disposition: attachment; filename=\"${WB_BACKUP_TYPE}_${SERIAL}_${date}.tar.gz\""
echo "Content-Type: application/octet-stream"
echo ""
sudo /usr/lib/wb-configs/wb_export.sh "$WB_BACKUP_TYPE" | run_pigz
