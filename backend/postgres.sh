#!/bin/bash

# PostgreSQL Docker management script

CONTAINER_NAME="uu-pipeline-monitor-postgres"
DB_NAME="uu_pipeline_monitor"

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
  echo "Usage: $0 {start|stop|restart|logs|status|shell}"
  echo ""
  echo "Commands:"
  echo "  start    - Start the PostgreSQL container"
  echo "  stop     - Stop the PostgreSQL container"
  echo "  restart  - Restart the PostgreSQL container"
  echo "  logs     - View container logs"
  echo "  status   - Check container status"
  echo "  shell    - Open psql shell connected to the database"
}

start_postgres() {
  echo -e "${BLUE}🚀 Starting PostgreSQL container...${NC}"
  
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      echo -e "${YELLOW}⚠️  Container already running${NC}"
      return
    else
      echo "Starting existing container..."
      docker start $CONTAINER_NAME
    fi
  else
    echo "Creating new container..."
    docker compose up -d postgres
  fi
  
  echo -e "${GREEN}✅ PostgreSQL is running${NC}"
  echo ""
  echo "Connection details:"
  echo "  Host: localhost"
  echo "  Port: 5432"
  echo "  User: postgres"
  echo "  Password: postgres"
  echo "  Database: $DB_NAME"
  echo ""
  echo "Connection string:"
  echo "  postgresql://postgres:postgres@localhost:5432/$DB_NAME"
}

stop_postgres() {
  echo -e "${BLUE}⏹️  Stopping PostgreSQL container...${NC}"
  
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker stop $CONTAINER_NAME
    echo -e "${GREEN}✅ PostgreSQL stopped${NC}"
  else
    echo -e "${YELLOW}⚠️  Container is not running${NC}"
  fi
}

restart_postgres() {
  echo -e "${BLUE}🔄 Restarting PostgreSQL container...${NC}"
  stop_postgres
  echo ""
  sleep 2
  start_postgres
}

view_logs() {
  echo -e "${BLUE}📋 PostgreSQL logs:${NC}"
  docker logs -f $CONTAINER_NAME
}

check_status() {
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}"
  else
    echo -e "${YELLOW}⚠️  PostgreSQL is not running${NC}"
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      echo "Container exists but is stopped. Run: $0 start"
    fi
  fi
}

open_shell() {
  if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running. Starting it...${NC}"
    start_postgres
  fi
  
  echo -e "${BLUE}🔌 Connecting to PostgreSQL...${NC}"
  PGPASSWORD=postgres docker exec -it $CONTAINER_NAME psql -U postgres -d $DB_NAME
}

# Main script logic
if [ $# -eq 0 ]; then
  print_usage
  exit 0
fi

case "$1" in
  start)
    start_postgres
    ;;
  stop)
    stop_postgres
    ;;
  restart)
    restart_postgres
    ;;
  logs)
    view_logs
    ;;
  status)
    check_status
    ;;
  shell)
    open_shell
    ;;
  *)
    echo "Unknown command: $1"
    print_usage
    exit 1
    ;;
esac
