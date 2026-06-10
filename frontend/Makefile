.PHONY: all test build clean install

WWW_ROOT = /var/www

all: build

clean:
	npm ci
	npm run clean

check-types:
	npm ci
	npm run check:type

lint:
	npm ci
	npm run lint

test:
	npm ci
	npm run test

build:
	npm ci
	npm run build

install:
	install -d -m 0777 $(DESTDIR)$(WWW_ROOT)/uploads
	rsync -av --exclude='*.eot' --exclude='*.map' dist/ $(DESTDIR)$(WWW_ROOT)
