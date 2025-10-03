#!/bin/bash

# Configure VAPI phone number to use server URL (transient assistant mode)

VAPI_API_KEY="2055cf30-ffaf-410c-b073-a243fd377d68"
PHONE_NUMBER_ID="8bac8f61-ca90-4b1c-a480-5872e906b63a"
SERVER_URL="https://agent-backend-7v2w.onrender.com/vapi/webhooks"

echo "Configuring VAPI phone number for transient assistant mode..."
echo "Phone Number ID: $PHONE_NUMBER_ID"
echo "Server URL: $SERVER_URL"
echo ""

curl -X PATCH "https://api.vapi.ai/phone-number/$PHONE_NUMBER_ID" \
  -H "Authorization: Bearer $VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"assistantId\": null,
    \"serverUrl\": \"$SERVER_URL\"
  }"

echo ""
echo ""
echo "Done! Phone number configured."
echo "Now call your VAPI number to test."
