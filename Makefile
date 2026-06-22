.PHONY: install dev test verify build docker-build smoke backup format format-check lint lint-fix workers

install:
	npm install

dev:
	npm run dev

test:
	npm test

test-coverage:
	npm run test:coverage

verify:
	npm run verify

build:
	npm run build

docker-build:
	npm run build:docker

smoke:
	node scripts/smoke-tests.mjs $(URL)

backup:
	node scripts/backup-supabase.mjs --env=production

format:
	npx prettier --write .

format-check:
	npx prettier --check .

lint:
	npm run lint

lint-fix:
	npm run lint:fix

workers:
	npm run workers:dev

supabase-up:
	docker compose up postgres redis mailpit -d

supabase-down:
	docker compose down

migrate:
	supabase db push
