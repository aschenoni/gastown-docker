.PHONY: test test-unit test-integration test-all

test: test-unit  ## Default: fast unit tests only

test-unit:  ## Unit tests — no Docker required
	npx vitest run tests/unit

test-integration:  ## Integration tests — builds Docker image, starts containers
	npx vitest run tests/integration --test-timeout=300000

test-all: test-unit test-integration  ## Run everything
