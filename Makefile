.PHONY: all build clean install uninstall

PATH := /usr/local/bin:$(PATH)

all: build

clean:
	npm run clean

build:
	# FIXME: this replaces git:// with https:// somewhere in node modules
	# which fixes build after Github banned unauthenticated access
	# (https://github.blog/2021-09-01-improving-git-protocol-security-github/)
	git config --global url."https://".insteadOf git://

	npm install
	git submodule init
	git submodule update
	npm run build

install:
	install -d -m 0777 $(DESTDIR)/var/www/css
	install -d -m 0777 $(DESTDIR)/var/www/images
	install -d -m 0777 $(DESTDIR)/var/www/uploads
	install -d -m 0777 $(DESTDIR)/var/www/scripts/i18n
	
	cp -a dist/css/*.css $(DESTDIR)/var/www/css
	cp -a dist/images/* $(DESTDIR)/var/www/images
	cp -a -R dist/scripts/i18n/* $(DESTDIR)/var/www/scripts/i18n
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
	install -m 0644 config.default.json $(DESTDIR)/usr/share/wb-mqtt-homeui/
	install -m 0644 config.wb5.json $(DESTDIR)/usr/share/wb-mqtt-homeui/
	install -m 0644 config.wb6.json $(DESTDIR)/usr/share/wb-mqtt-homeui/

	install -d $(DESTDIR)/usr/lib/wb-mqtt-homeui
	install -m 0755 convert_config_v1v2.py $(DESTDIR)/usr/lib/wb-mqtt-homeui/convert_config_v1v2

	install -d $(DESTDIR)/usr/share/wb-mqtt-confed/schemas
	install -m 0644 webui.schema.json $(DESTDIR)/usr/share/wb-mqtt-confed/schemas/webui.schema.json
	
	install -d  $(DESTDIR)/etc/wb-configs.d
	install -m 0644 wb-configs.rules $(DESTDIR)/etc/wb-configs.d/20wb-mqtt-homeui

uninstall:
	rm -fR $(DESTDIR)/var/www/*
	rm -f $(DESTDIR)/etc/wb-webui.conf
	rm -fR $(DESTDIR)/var/www/uploads/
	rm -fR $(DESTDIR)/usr/share/wb-mqtt-confed
	rm -fR $(DESTDIR)/usr/share/wb-mqtt-homeui
