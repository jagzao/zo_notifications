.PHONY: help start stop restart logs build clean test dev prod

# Colores para output
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
WHITE  := $(shell tput -Txterm setaf 7)
RESET  := $(shell tput -Txterm sgr0)

help: ## Mostrar esta ayuda
	@echo ''
	@echo 'Uso:'
	@echo '  ${YELLOW}make${RESET} ${GREEN}<target>${RESET}'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  ${YELLOW}%-15s${GREEN}%s${RESET}\n", $$1, $$2}' $(MAKEFILE_LIST)

start: ## Iniciar todos los servicios
	@echo "${GREEN}Iniciando ZO Notifications...${RESET}"
	@./scripts/start.sh

stop: ## Detener todos los servicios
	@echo "${YELLOW}Deteniendo servicios...${RESET}"
	@docker-compose down

restart: stop start ## Reiniciar todos los servicios

logs: ## Ver logs de todos los servicios
	@docker-compose logs -f

build: ## Construir imágenes Docker
	@echo "${GREEN}Construyendo imágenes...${RESET}"
	@docker-compose build

clean: ## Limpiar volúmenes y contenedores
	@echo "${YELLOW}⚠️  Esto eliminará todos los datos. ¿Continuar? [y/N]${RESET}" && read ans && [ $${ans:-N} = y ]
	@docker-compose down -v
	@echo "${GREEN}Limpieza completada${RESET}"

test: ## Ejecutar tests de notificación
	@echo "${GREEN}Enviando notificaciones de prueba...${RESET}"
	@./scripts/test-notification.sh

dev: ## Modo desarrollo con hot reload
	@echo "${GREEN}Iniciando en modo desarrollo...${RESET}"
	@docker-compose -f docker-compose.dev.yml up

prod: ## Modo producción
	@echo "${GREEN}Iniciando en modo producción...${RESET}"
	@docker-compose up -d

status: ## Ver estado de los servicios
	@docker-compose ps

health: ## Verificar health del API
	@curl -s http://localhost:3000/api/v1/health | jq '.' || echo "API no disponible"

stats: ## Ver estadísticas
	@curl -s "http://localhost:3000/api/v1/stats?period=24h" -H "X-API-Key: test-key-change-this-in-production" | jq '.' || echo "Error obteniendo stats"

keys: ## Generar VAPID keys
	@./scripts/generate-vapid-keys.sh

shell-api: ## Abrir shell en el contenedor del API
	@docker-compose exec api sh

shell-db: ## Abrir psql en PostgreSQL
	@docker-compose exec postgres psql -U notifier -d notifications

shell-redis: ## Abrir redis-cli
	@docker-compose exec redis redis-cli -a $$(grep REDIS_PASSWORD .env | cut -d '=' -f2)

install: ## Instalar dependencias en todos los proyectos
	@echo "${GREEN}Instalando dependencias...${RESET}"
	@cd api && npm install
	@cd frontend && npm install
	@cd workers/webpush-worker && npm install
	@cd workers/discord-worker && npm install
	@echo "${GREEN}✅ Dependencias instaladas${RESET}"

update: ## Actualizar dependencias
	@echo "${GREEN}Actualizando dependencias...${RESET}"
	@cd api && npm update
	@cd frontend && npm update
	@cd workers/webpush-worker && npm update
	@cd workers/discord-worker && npm update

.DEFAULT_GOAL := help
