.PHONY: all test build clean install

WWW_ROOT = /var/www

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

install:
	install -d -m 0777 $(DESTDIR)$(WWW_ROOT)/uploads
	rsync -av --exclude='*.eot' --exclude='*.map' dist/ $(DESTDIR)$(WWW_ROOT)
