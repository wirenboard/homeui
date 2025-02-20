.PHONY: all test clean install uninstall frontend

all: frontend

clean:
	$(MAKE) -C frontend clean

test:
	$(MAKE) -C frontend test

frontend:
	$(MAKE) -C frontend

install:
	$(MAKE) -C frontend install

uninstall:
	$(MAKE) -C frontend uninstall
