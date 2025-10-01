.PHONY: install configs

PREFIX = /usr

BOARDS := wb6 wb7 wb74 wb8 wb85

all:
	cd webui-configs; \
	for wb in $(BOARDS); do \
	  minify $$wb.svg > $$wb.min.svg; \
	  j2 config.$$wb.json.jinja > config.$$wb.json; \
	done

install:
	install -d -m 0777 $(DESTDIR)$(PREFIX)/share/wb-mqtt-homeui/nginx/includes
	install -Dm0644 webui-configs/*.json -t $(DESTDIR)$(PREFIX)/share/wb-mqtt-homeui
	install -Dm0755 wb-homeui-backend -t $(DESTDIR)$(PREFIX)/bin
	install -Dm0755 wb-homeui-users -t $(DESTDIR)$(PREFIX)/bin
	install -Dm0644 21wb-homeui-backend -t $(DESTDIR)/etc/wb-configs.d
	cp -a -R configs/* $(DESTDIR)
