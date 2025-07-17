# Tiledesk API Push

This document defines how Pipedream can send a message **back into a Tiledesk conversation** once the OpenAI response is ready.

## Endpoint Format

https://<your_project_id>.tiledesk.io/v2/projects/<project_id>/requests/<request_id>/messages

## Method
`POST`

## Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <your_bot_token>"
}

Body

{
  "text": "Your AI reply here",
  "type": "text"
}
