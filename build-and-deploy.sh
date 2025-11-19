#!/bin/bash
set -e  # Exit on error

echo "🔨 Building Docker image..."
echo ""

# Build and push the image
gcloud builds submit --config cloudbuild.web.yaml \
  --project=aviato-cap-dev2 \
  --substitutions=_TAG=latest

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Build failed"
  exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "🚀 Deploying to Cloud Run..."
echo ""

# Deploy to Cloud Run
gcloud run deploy cloud-run-service \
  --image=australia-southeast1-docker.pkg.dev/aviato-cap-dev2/cap-repo/cap-web:latest \
  --region=australia-southeast1 \
  --project=aviato-cap-dev2 \
  --platform=managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=aviato-cap-dev2:australia-southeast1:cap-sql-aviato-cap-dev2 \
  --update-env-vars="DB_NAME=capdb,INSTANCE_CONNECTION_NAME=aviato-cap-dev2:australia-southeast1:cap-sql-aviato-cap-dev2"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "🔍 Check logs:"
  echo "   gcloud run services logs read cloud-run-service --region=australia-southeast1 --project=aviato-cap-dev2 --limit=50"
else
  echo ""
  echo "❌ Deployment failed"
  exit 1
fi

