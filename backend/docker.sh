#!/bin/bash

# Docker services management script (PostgreSQL + RabbitMQ)

POSTGRES_CONTAINER="uu-pipeline-monitor-postgres"
RABBITMQ_CONTAINER="uu-pipeline-monitor-rabbitmq"
DB_NAME="uu_pipeline_monitor"

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
  echo "Usage: $0 {start|stop|restart|logs|status|shell|rabbitmq}"
  echo ""
  echo "Commands:"
  echo "  start        - Start PostgreSQL and RabbitMQ containers"
  echo "  stop         - Stop PostgreSQL and RabbitMQ containers"
  echo "  restart      - Restart PostgreSQL and RabbitMQ containers"
  echo "  logs         - View PostgreSQL logs (add 'rabbitmq' to view RabbitMQ logs)"
  echo "  status       - Check container status"
  echo "  shell        - Open psql shell connected to the database"
  echo "  rabbitmq     - Open RabbitMQ management UI"
}

start_services() {
  echo -e "${BLUE}🚀 Starting services...${NC}"
  
  # Check if containers exist and are running
  PG_RUNNING=$(docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$" && echo "true" || echo "false")
  RABBIT_RUNNING=$(docker ps --format '{{.Names}}' | grep -q "^${RABBITMQ_CONTAINER}$" && echo "true" || echo "false")
  
  if [ "$PG_RUNNING" = "true" ] && [ "$RABBIT_RUNNING" = "true" ]; then
    echo -e "${YELLOW}⚠️  All containers already running${NC}"
    return
  fi
  
  docker compose up -d
  
  echo -e "${GREEN}✅ Services started${NC}"
  echo ""
  echo "PostgreSQL connection:"
  echo "  Host: localhost:5432"
  echo "  User: postgres / Password: postgres"
  echo "  Database: $DB_NAME"
  echo ""
  echo "RabbitMQ connection:"
  echo "  AMQP: amqp://guest:guest@localhost:5672"
  echo "  Management UI: http://localhost:15672 (guest/guest)"
}

stop_services() {
  echo -e "${BLUE}⏹️  Stopping services...${NC}"
  docker compose down
  echo -e "${GREEN}✅ Services stopped${NC}"
}

restart_services() {
  echo -e "${BLUE}🔄 Restarting services...${NC}"
  stop_services
  echo ""
  sleep 2
  start_services
}

view_logs() {
  if [ "$2" = "rabbitmq" ]; then
    echo -e "${BLUE}📋 RabbitMQ logs:${NC}"
    docker logs -f $RABBITMQ_CONTAINER
  else
    echo -e "${BLUE}📋 PostgreSQL logs:${NC}"
    docker logs -f $POSTGRES_CONTAINER
  fi
}

check_status() {
  echo -e "${BLUE}📊 Container Status:${NC}"
  docker compose ps
}

open_shell() {
  if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running. Starting it...${NC}"
    start_services
  fi
  
  echo -e "${BLUE}🔌 Connecting to PostgreSQL...${NC}"
  PGPASSWORD=postgres docker exec -it $POSTGRES_CONTAINER psql -U postgres -d $DB_NAME
}

open_rabbitmq_ui() {
  if ! docker ps --format '{{.Names}}' | grep -q "^${RABBITMQ_CONTAINER}$"; then
    echo -e "${YELLOW}⚠️  RabbitMQ is not running. Starting it...${NC}"
    start_services
  fi
  
  echo -e "${GREEN}✅ RabbitMQ Management UI: http://localhost:15672${NC}"
  echo "   Username: guest"
  echo "   Password: guest"
  echo ""
  
  # Try to open in browser
  if command -v open &> /dev/null; then
    open http://localhost:15672
  elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:15672
  else
    echo "Please open http://localhost:15672 in your browser"
  fi
}

# Main script logic
if [ $# -eq 0 ]; then
  print_usage
  exit 0
fi

case "$1" in
  start)
    start_services
    ;;
  stop)
    stop_services
    ;;
  restart)
    restart_services
    ;;
  logs)
    view_logs "$@"
    ;;
  status)
    check_status
    ;;
  shell)
    open_shell
    ;;
  rabbitmq)
    open_rabbitmq_ui
    ;;
  *)
    echo "Unknown command: $1"
    print_usage
    exit 1
    ;;
esac

