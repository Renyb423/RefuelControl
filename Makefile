.DEFAULT_GOAL := help

.PHONY: help install start build test

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-10s %s\n", $$1, $$2}'

install: ## Install dependencies with npm ci
	npm ci

start: ## Generate environment and serve locally
	npm start

build: ## Generate environment and build production bundle
	npm run build

test: ## Generate environment and run tests once without watch mode
	npm run config && npm test -- --watch=false
