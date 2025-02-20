.PHONY: all test clean install uninstall

all: frontend

clean:
	$(MAKE) -C frontend clean

test:
	# FIXME: this replaces git:// with https:// somewhere in node modules
	# which fixes build after Github banned unauthenticated access
	# (https://github.blog/2021-09-01-improving-git-protocol-security-github/)
	git config url."https://".insteadOf git://
	git submodule foreach --recursive git config url."https://".insteadOf git://

	$(MAKE) -C frontend test

frontend:
	# FIXME: this replaces git:// with https:// somewhere in node modules
	# which fixes build after Github banned unauthenticated access
	# (https://github.blog/2021-09-01-improving-git-protocol-security-github/)
	git config url."https://".insteadOf git://
	git submodule foreach --recursive git config url."https://".insteadOf git://

	$(MAKE) -C frontend
