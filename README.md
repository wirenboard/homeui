# homeui

Wiren Board web interface.

## MQTT naming conventions

See into [conventions](https://github.com/wirenboard/conventions/blob/main/README.md) to understand how to organize devices and controls (what write to /meta/type for example).

## NGINX configuration

The config is stored in `/etc/wb-webui.conf`.
Add your custom configuration to `/etc/nginx/includes/default.wb.d/*.conf`.
Change listen settings in `/etc/nginx/includes/default.wb.d/listen.conf`.

## Running local development

1. Navigate to the project directory: `cd ./frontend`
2. Install dependencies: `npm install`
3. Create `.env` file and set `MQTT_BROKER_URI` if your controller is running on different IP (default is 10.200.200.1)
4. Start the development server: `npm run start`
