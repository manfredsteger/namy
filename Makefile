.PHONY: install build clean docker-build docker-build-no-cache docker-run docker-clean

IMAGE_NAME = file-renamer-pro
PORT = 3000

# Local development commands
install:
	npm install

build:
	npm run build

clean:
	rm -rf dist node_modules

# Docker commands
docker-build:
	docker build -t $(IMAGE_NAME) .

docker-build-no-cache:
	docker build --no-cache -t $(IMAGE_NAME) .

docker-run:
	docker run -p $(PORT):$(PORT) -e PORT=$(PORT) $(IMAGE_NAME)

docker-clean:
	docker rmi $(IMAGE_NAME) || true
