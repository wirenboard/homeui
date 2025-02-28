# homeui

Wiren Board web interface.

## MQTT naming conventions

See into [conventions](https://github.com/wirenboard/conventions/blob/main/README.md) to understand how to organize devices and controls (what write to /meta/type for example).

## NGINX configuration

The config is stored in `/usr/share/wb-mqtt-homeui/default.conf`.
Add your custom configuration to `/etc/nginx/includes/default.wb.d/*.conf`.
Change listen settings in `/etc/nginx/includes/default.wb.d/listen.conf`.