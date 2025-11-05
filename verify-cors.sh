#!/bin/bash

# Script to verify CORS configuration on GCS bucket
# Usage: ./verify-cors.sh YOUR_BUCKET_NAME

BUCKET_NAME=${1:-"aviato-cap-tf-state-muskan-20250913"}

echo "Checking CORS configuration for bucket: $BUCKET_NAME"
echo ""

# Check current CORS config
echo "Current CORS configuration:"
gsutil cors get gs://$BUCKET_NAME
echo ""

# Test if CORS is set
CORS_CONFIG=$(gsutil cors get gs://$BUCKET_NAME 2>&1)
if [[ "$CORS_CONFIG" == *"[]"* ]] || [[ "$CORS_CONFIG" == *"No CORS configuration"* ]]; then
    echo "❌ ERROR: CORS configuration is empty or not set!"
    echo ""
    echo "To set CORS configuration, run:"
    echo "  gsutil cors set cors.json gs://$BUCKET_NAME"
else
    echo "✅ CORS configuration found"
fi

echo ""
echo "To update CORS configuration:"
echo "  1. Edit cors.json if needed"
echo "  2. Run: gsutil cors set cors.json gs://$BUCKET_NAME"
echo "  3. Wait 1-2 minutes for propagation"
echo "  4. Test in incognito window"

