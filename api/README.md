# Chatbot ENISA - Backend API

Backend API para el chatbot de Premoney especializado en consultas sobre financiación ENISA.

## Configuración

### Variables de entorno necesarias:
- `NOTION_TOKEN`: Token de integración de Notion
- `NOTION_DATABASE_ID`: ID de la base de datos de Notion

### Endpoints:
- `POST /api/chatbot`: Recibe una pregunta y devuelve una respuesta

### Estructura de la request:
```json
{
  "message": "¿Qué requisitos necesito para ENISA?"
}
