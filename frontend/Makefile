.PHONY: all check-types lint test build clean install

WWW_ROOT = /var/www

all: build

# npm ci wipes node_modules and installs it from scratch, so running it at the top of every target
# made one package build install the whole dependency tree several times over. Depend on the
# directory instead - it is reinstalled only when the lockfile is newer than it.
node_modules: package-lock.json
	npm ci
	touch node_modules

# dh_auto_clean runs before anything is installed, and npm run clean is just rimraf over three
# directories, so doing it by hand here keeps the clean step from pulling in the dependencies.
clean:
	rm -rf dist coverage tmp

check-types: node_modules
	npm run check:types

lint: node_modules
	npm run lint

test: node_modules
	npm run test

build: node_modules
	npm run build

install:
	install -d -m 0777 $(DESTDIR)$(WWW_ROOT)/uploads
	rsync -av --exclude='*.eot' --exclude='*.map' dist/ $(DESTDIR)$(WWW_ROOT)
