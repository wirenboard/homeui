.PHONY: all

PATH := /usr/local/bin:$(PATH)

all: build install

build:
	npm install
	git submodule init
	git submodule update
	npm run build

install:
	mkdir $(DESTDIR)/var/www/css $(DESTDIR)/var/www/images $(DESTDIR)/var/www/views
	cp -a  dist/css/*  $(DESTDIR)/var/www/css/
	cp -a  dist/images/*  $(DESTDIR)/var/www/images/
	cp -a  dist/views/*  $(DESTDIR)/var/www/views/
	cp -a  dist/favicon.ico  $(DESTDIR)/var/www/favicon.ico
	cp -a  dist/*.js  $(DESTDIR)/var/www/
	cp -a  dist/*.svg  $(DESTDIR)/var/www/
	cp -a  dist/*.ttf  $(DESTDIR)/var/www/
	cp -a  dist/*.woff  $(DESTDIR)/var/www/
	cp -a  dist/*.woff2  $(DESTDIR)/var/www/

	install  -m 0644 dist/404.html  $(DESTDIR)/var/www/
	install  -m 0644 dist/robots.txt  $(DESTDIR)/var/www/
	install  -m 0644 dist/index.html  $(DESTDIR)/var/www/

	install -m 0644 default_config_dump.tsv $(DESTDIR)/usr/share/wb-mqtt-homeui/default_config_dump.tsv
	install -m 0644 default_config_dump.wb5.tsv $(DESTDIR)/usr/share/wb-mqtt-homeui/default_config_dump.wb5.tsv

	install -d -m 0777 $(DESTDIR)/var/www/uploads/

	install -d $(DESTDIR)/etc
	mkdir -p $(DESTDIR)/usr/share/wb-mqtt-confed/schemas
	install -m 0644 wb-webui.conf $(DESTDIR)/etc/wb-webui.conf
	install -m 0644 webui.schema.json $(DESTDIR)/usr/share/wb-mqtt-confed/schemas/webui.schema.json
