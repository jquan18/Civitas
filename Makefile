# Paths
BACKEND_DIR := backend
FRONTEND_DIR := frontend
CONTRACTS_DIR := contracts

.PHONY: all setup setup-backend setup-frontend setup-contracts \
        build build-backend build-frontend build-contracts \
        dev dev-backend dev-frontend \
        test test-contracts \
        clean clean-backend clean-frontend clean-contracts \
        help

all: setup

# --- Setup ---
setup: setup-backend setup-frontend setup-contracts

setup-backend:
	@echo "Installing backend dependencies..."
	cd $(BACKEND_DIR) && pnpm install

setup-frontend:
	@echo "Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && pnpm install

setup-contracts:
	@echo "Installing foundry dependencies..."
	cd $(CONTRACTS_DIR) && forge install

# --- Build ---
build: build-backend build-frontend build-contracts

build-backend:
	@echo "Building backend..."
	cd $(BACKEND_DIR) && pnpm build

build-frontend:
	@echo "Building frontend..."
	cd $(FRONTEND_DIR) && pnpm build

build-contracts:
	@echo "Building contracts..."
	cd $(CONTRACTS_DIR) && forge build

# --- Dev ---
dev:
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend:
	@echo "Starting backend dev server..."
	cd $(BACKEND_DIR) && pnpm dev

dev-frontend:
	@echo "Starting frontend dev server..."
	cd $(FRONTEND_DIR) && pnpm dev

# --- Test ---
test: test-contracts

test-contracts:
	@echo "Testing contracts..."
	cd $(CONTRACTS_DIR) && forge test

# --- Clean ---
clean: clean-backend clean-frontend clean-contracts

clean-backend:
	@echo "Cleaning backend..."
	rm -rf $(BACKEND_DIR)/node_modules $(BACKEND_DIR)/dist

clean-frontend:
	@echo "Cleaning frontend..."
	rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/.next

clean-contracts:
	@echo "Cleaning contracts..."
	cd $(CONTRACTS_DIR) && forge clean

# --- Help ---
help:
	@echo "Available targets:"
	@echo "  setup           - Install dependencies for all components"
	@echo "  build           - Build all components"
	@echo "  test            - Run tests (currently only contracts)"
	@echo "  clean           - Remove build artifacts and dependencies"
	@echo "  dev             - Run backend and frontend dev servers in parallel"
	@echo "  dev-backend     - Run backend dev server"
	@echo "  dev-frontend    - Run frontend dev server"
