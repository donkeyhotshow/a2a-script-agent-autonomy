# Makefile for ai-integration development

.PHONY: help install install-dev test clean lint format

# Default target
help:
	@echo "Available targets:"
	@echo "  install     - Install package and dependencies"
	@echo "  install-dev - Install with development dependencies"
	@echo "  test        - Run tests"
	@echo "  clean       - Clean build artifacts"
	@echo "  lint        - Run linters"
	@echo "  format      - Format code"

# Installation
install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements.txt
	pip install pytest black isort mypy flake8

# Testing
test:
	pytest scripts/ -v

test-integration:
	python scripts/test_ai_integration.py

# Code quality
lint:
	flake8 proxy/ scripts/
	mypy proxy/

format:
	black proxy/ scripts/
	isort proxy/ scripts/

# Cleanup
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +

# Development server
run:
	python -m proxy

# Docker
docker-build:
	docker build -t ai-integration .

docker-run:
	docker run -p 11435:11435 -e LOCAL_LLM_UPSTREAM_URL=http://host.docker.internal:11434 ai-integration