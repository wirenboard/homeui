.PHONY: all test build clean install uninstall configs

PATH := /usr/local/bin:$(PATH)

all: build

clean:
	npm install
	npm run clean

test:
	npm install
	npm run test

build:
	npm install
	npm run build

configs:
	mkdir -p dist/configs
	cp -a configs/config.*.json dist/configs
	for wb in wb6 wb7 wb74 wb8 wb85; do \
	  minify configs/$$wb.svg > dist/configs/$$wb.svg; \
	  j2 configs/config.$$wb.json.jinja > dist/configs/config.$$wb.json; \
	done
	cp -a configs/eventsConfig.default.json dist/configs

install: configs
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

	install -m 0644 dist/robots.txt $(DESTDIR)/var/www/
	install -m 0644 dist/index.html $(DESTDIR)/var/www/

	install -Dm0644 dist/configs/*.json -t $(DESTDIR)/usr/share/wb-mqtt-homeui
	install -Dm0644 webui.schema.json -t $(DESTDIR)/usr/share/wb-mqtt-confed/schemas
	install -Dm0644 events.schema.json -t $(DESTDIR)/usr/share/wb-mqtt-confed/schemas
	install -Dm0644 wb-configs.rules $(DESTDIR)/etc/wb-configs.d/20wb-mqtt-homeui

uninstall:
	rm -fR $(DESTDIR)/var/www/*
	rm -f $(DESTDIR)/etc/wb-webui.conf
	rm -fR $(DESTDIR)/var/www/uploads/
	rm -fR $(DESTDIR)/usr/share/wb-mqtt-confed
	rm -fR $(DESTDIR)/usr/share/wb-mqtt-homeui
