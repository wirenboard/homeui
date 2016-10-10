.PHONY: all clean

PATH := /usr/local/bin:$(PATH)

all:
	bower install --allow-root

clean :
	#~ /usr/local/bin/bower  cache clean --allow-root
	#~ rm -rf bower_components


install: all
	install -d -m 0777 $(DESTDIR)/var/www/hitedconf/

	cp -a  bower_components/*  $(DESTDIR)/var/www/hitedconf/bower_components/
	cp -a  app/images/*  $(DESTDIR)/var/www/hitedconf/images/
	cp -a  app/lib/*  $(DESTDIR)/var/www/hitedconf/lib/
	cp -a  app/styles/*  $(DESTDIR)/var/www/hitedconf/styles/
	cp -a  app/views/*  $(DESTDIR)/var/www/hitedconf/views/
	cp -a  app/scripts/*  $(DESTDIR)/var/www/hitedconf/scripts/

	install  -m 0644 app/404.html  $(DESTDIR)/var/www/hitedconf/
	install  -m 0644 app/robots.txt  $(DESTDIR)/var/www/hitedconf/
	install  -m 0644 app/index.html  $(DESTDIR)/var/www/hitedconf/
	install  -m 0644 nginx_custom.conf $(DESTDIR)/etc/nginx/sites-available/hited
