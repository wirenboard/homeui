#!/bin/bash

# nginx user should has rw access to fwupdate uploads dir
nginx_uploads_dir="/mnt/data/uploads"
nginx_user="www-data"

if [[ -d $nginx_uploads_dir ]] && id -u $nginx_user > /dev/null 2>&1; then
    chown -R $nginx_user:$nginx_user $nginx_uploads_dir
fi

# grant access fastcgi scripts to mosquitto's unix socket
usermod -a -G mosquitto $nginx_user 
