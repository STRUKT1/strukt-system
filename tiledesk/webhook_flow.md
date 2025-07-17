# Webhook Flow (Tiledesk → Pipedream)

## Trigger Block
User sends a message like:  
"What's a high-protein dinner?"

This triggers a **Webhook Request** block that sends:

```json
{
  "message": "{{lastUserText}}",
  "email": "{{userEmail}}"
}

To the following URL:

https://eo3v942nix0chzn.m.pipedream.net
