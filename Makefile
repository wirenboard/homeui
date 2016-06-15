.PHONY: all clean

PATH := /usr/local/bin:$(PATH)

all:
	bower install --allow-root

clean :
	#~ /usr/local/bin/bower  cache clean --allow-root
	#~ rm -rf bower_components


install: all
	cp -a  bower_components/*  $(DESTDIR)/var/www/bower_components/
	cp -a  app/images/*  $(DESTDIR)/var/www/images/
	cp -a  app/lib/*  $(DESTDIR)/var/www/lib/
	cp -a  app/styles/*  $(DESTDIR)/var/www/styles/
	cp -a  app/views/*  $(DESTDIR)/var/www/views/
	cp -a  app/scripts/*  $(DESTDIR)/var/www/scripts/

	install  -m 0644 app/404.html  $(DESTDIR)/var/www/
	install  -m 0644 app/robots.txt  $(DESTDIR)/var/www/
	install  -m 0644 app/index.html  $(DESTDIR)/var/www/

	install -m 0644 default_config_dump.tsv $(DESTDIR)/usr/share/wb-mqtt-homeui/default_config_dump.tsv
	install -m 0644 default_config_dump.wb5.tsv $(DESTDIR)/usr/share/wb-mqtt-homeui/default_config_dump.wb5.tsv

	install -d -m 0777 $(DESTDIR)/var/www/uploads/

	install -d $(DESTDIR)/etc
	mkdir -p $(DESTDIR)/usr/share/wb-mqtt-confed/schemas
	install -m 0644 wb-webui.conf $(DESTDIR)/etc/wb-webui.conf
	install -m 0644 webui.schema.json $(DESTDIR)/usr/share/wb-mqtt-confed/schemas/webui.schema.json
