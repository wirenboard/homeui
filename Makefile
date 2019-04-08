.PHONY: all build clean install uninstall

PATH := /usr/local/bin:$(PATH)

all: build

clean:
	npm run clean

build:
	npm install
	git submodule init
	git submodule update
	npm run build

install:
	install -d -m 0777 $(DESTDIR)/var/www/css
	install -d -m 0777 $(DESTDIR)/var/www/images
	install -d -m 0777 $(DESTDIR)/var/www/uploads
	
	cp -a dist/css/*.css $(DESTDIR)/var/www/css
	cp -a dist/images/* $(DESTDIR)/var/www/images
	cp -a dist/favicon.ico $(DESTDIR)/var/www/favicon.ico
	cp -a dist/*.js $(DESTDIR)/var/www/
	cp -a dist/*.svg $(DESTDIR)/var/www/
	cp -a dist/*.png $(DESTDIR)/var/www/
	cp -a dist/*.ttf $(DESTDIR)/var/www/
	cp -a dist/*.woff $(DESTDIR)/var/www/
	cp -a dist/*.woff2 $(DESTDIR)/var/www/ || :

	install -m 0644 dist/404.html $(DESTDIR)/var/www/
	install -m 0644 dist/robots.txt $(DESTDIR)/var/www/
	install -m 0644 dist/index.html $(DESTDIR)/var/www/

	install -d $(DESTDIR)/usr/share/wb-mqtt-homeui
	install -m 0644 default_config_dump.tsv $(DESTDIR)/usr/share/wb-mqtt-homeui/default_config_dump.tsv
	install -m 0644 default_config_dump.wb5.tsv $(DESTDIR)/usr/share/wb-mqtt-homeui/default_config_dump.wb5.tsv
	install -m 0644 default_config_dump.wb6.tsv $(DESTDIR)/usr/share/wb-mqtt-homeui/default_config_dump.wb6.tsv

	install -d $(DESTDIR)/usr/lib/wb-mqtt-homeui
	install -m 0755 convert_config_v1v2.py $(DESTDIR)/usr/lib/wb-mqtt-homeui/convert_config_v1v2

	install -d $(DESTDIR)/usr/share/wb-mqtt-confed/schemas
	install -m 0644 webui.schema.json $(DESTDIR)/usr/share/wb-mqtt-confed/schemas/webui.schema.json

uninstall:
	rm -fR $(DESTDIR)/var/www/*
	rm -f $(DESTDIR)/etc/wb-webui.conf
	rm -fR $(DESTDIR)/var/www/uploads/
	rm -fR $(DESTDIR)/usr/share/wb-mqtt-confed
	rm -fR $(DESTDIR)/usr/share/wb-mqtt-homeui
