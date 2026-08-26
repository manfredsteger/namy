# Namy - Makefile
# Professional development and deployment workflow for Namy (File Renamer Pro)

# ============================================
# Configuration
# ============================================
IMAGE_NAME ?= manfredsteger/namy
IMAGE_TAG ?= latest
PORT ?= 3001
DEV_PORT ?= 3002

# Colors
GREEN = \033[0;32m
YELLOW = \033[0;33m
NC = \033[0m

.PHONY: help setup install dev logs shell build prod prod-down restart login push publish pull rebuild fresh lint ci clean prune clean-local version

help:
	@echo "$(YELLOW)Namy Makefile Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Quick Setup$(NC)"
	@echo "  setup         - Start production container (docker compose up -d)"
	@echo ""
	@echo "$(GREEN)Development$(NC)"
	@echo "  install       - Install local npm dependencies"
	@echo "  dev           - Run local Vite dev server on port $$(DEV_PORT)"
	@echo "  logs          - View Docker container logs (follow)"
	@echo "  shell         - Open a shell inside the running container"
	@echo ""
	@echo "$(GREEN)Production$(NC)"
	@echo "  build         - Build the Docker image locally"
	@echo "  prod          - Build and start production container"
	@echo "  prod-down     - Stop and remove production container"
	@echo "  restart       - Restart the application container"
	@echo ""
	@echo "$(GREEN)Docker Registry$(NC)"
	@echo "  login         - Login to Docker Hub"
	@echo "  push          - Push image to registry"
	@echo "  publish       - Build and push image to registry"
	@echo "  pull          - Pull latest image from registry"
	@echo ""
	@echo "$(GREEN)Docker Fresh Build$(NC)"
	@echo "  rebuild       - Build the image without cache"
	@echo "  fresh         - Full clean, fresh build, and start"
	@echo ""
	@echo "$(GREEN)Code Quality$(NC)"
	@echo "  lint          - Run TypeScript type checking"
	@echo "  ci            - Run CI pipeline locally (Lint & Build)"
	@echo ""
	@echo "$(GREEN)Maintenance$(NC)"
	@echo "  clean         - Remove containers, images, and orphans"
	@echo "  prune         - Prune unused Docker data and builder cache"
	@echo "  clean-local   - Remove local node_modules and dist"
	@echo ""
	@echo "$(GREEN)Version$(NC)"
	@echo "  version       - Show current image version/tag"

# ============================================
# Quick Setup
# ============================================
setup:
	@echo "$(YELLOW)Starting Namy container...$(NC)"
	docker compose up -d
	@echo "$(GREEN)App running at http://localhost:$(PORT)$(NC)"

# ============================================
# Development
# ============================================
install:
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)Install complete.$(NC)"

dev:
	@echo "$(YELLOW)Starting local development server on port $(DEV_PORT)...$(NC)"
	npm run dev -- --port $(DEV_PORT)

logs:
	@echo "$(YELLOW)Attaching to logs...$(NC)"
	docker compose logs -f app

shell:
	@echo "$(YELLOW)Opening shell in the app container...$(NC)"
	docker compose exec app sh

# ============================================
# Production
# ============================================
build:
	@echo "$(YELLOW)Building Docker image $(IMAGE_NAME):$(IMAGE_TAG)...$(NC)"
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "$(GREEN)Build complete.$(NC)"

prod:
	@echo "$(YELLOW)Building and starting production container...$(NC)"
	docker compose up -d --build
	@echo "$(GREEN)App running at http://localhost:$(PORT)$(NC)"

prod-down:
	@echo "$(YELLOW)Stopping production container...$(NC)"
	docker compose down
	@echo "$(GREEN)Containers stopped.$(NC)"

restart:
	@echo "$(YELLOW)Restarting app container...$(NC)"
	docker compose restart app
	@echo "$(GREEN)Restart complete.$(NC)"

# ============================================
# Docker Registry
# ============================================
login:
	@echo "$(YELLOW)Logging in to Docker Registry...$(NC)"
	docker login
	@echo "$(GREEN)Login complete.$(NC)"

push:
	@echo "$(YELLOW)Pushing $(IMAGE_NAME):$(IMAGE_TAG)...$(NC)"
	docker push $(IMAGE_NAME):$(IMAGE_TAG)
	@echo "$(GREEN)Push complete.$(NC)"

publish: build push
	@echo "$(GREEN)Publish complete.$(NC)"

pull:
	@echo "$(YELLOW)Pulling $(IMAGE_NAME):$(IMAGE_TAG)...$(NC)"
	docker pull $(IMAGE_NAME):$(IMAGE_TAG)
	@echo "$(GREEN)Pull complete.$(NC)"

# ============================================
# Docker Fresh Build
# ============================================
rebuild:
	@echo "$(YELLOW)Rebuilding image without cache...$(NC)"
	docker compose build --no-cache
	@echo "$(GREEN)Rebuild complete.$(NC)"

fresh: clean rebuild
	@echo "$(YELLOW)Starting fresh containers...$(NC)"
	docker compose up -d
	@echo "$(GREEN)App running at http://localhost:$(PORT)$(NC)"

# ============================================
# Code Quality
# ============================================
lint:
	@echo "$(YELLOW)Running type checks...$(NC)"
	npx tsc --noEmit
	@echo "$(GREEN)Lint complete.$(NC)"

ci:
	@echo "$(YELLOW)Running CI pipeline...$(NC)"
	@echo "$(YELLOW)1/2 Type-Check$(NC)"
	npx tsc --noEmit
	@echo "$(YELLOW)2/2 Build$(NC)"
	npm run build
	@echo "$(GREEN)CI complete.$(NC)"

# ============================================
# Maintenance
# ============================================
clean:
	@echo "$(YELLOW)Cleaning Docker resources...$(NC)"
	docker compose down --remove-orphans
	docker rmi namy-app $(IMAGE_NAME):$(IMAGE_TAG) 2>/dev/null || true
	docker image prune -f
	@echo "$(GREEN)Clean complete.$(NC)"

prune:
	@echo "$(YELLOW)Pruning Docker system...$(NC)"
	docker system prune -f
	docker builder prune -f
	@echo "$(GREEN)Prune complete.$(NC)"

clean-local:
	@echo "$(YELLOW)Cleaning local files...$(NC)"
	rm -rf dist node_modules
	@echo "$(GREEN)Local clean complete.$(NC)"

# ============================================
# Version
# ============================================
version:
	@echo "$(GREEN)$(IMAGE_NAME):$(IMAGE_TAG)$(NC)"
