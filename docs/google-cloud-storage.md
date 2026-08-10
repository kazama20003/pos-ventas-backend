# Google Cloud Storage

El backend genera URLs firmadas de tipo `PUT` para que el navegador suba imágenes
directamente al bucket. Por eso se deben configurar dos CORS distintos.

## API

Definir `CORS_ORIGIN` con los dominios exactos del frontend, separados por comas:

```dotenv
CORS_ORIGIN="https://app.example.com,https://admin.example.com"
```

En producción la aplicación no arranca si esta variable es `*` o está vacía.

## Bucket

Crear un archivo local `gcs-cors.json` con los dominios reales y aplicarlo al
bucket. No usar `*` en producción.

```json
[
  {
    "origin": ["https://app.example.com", "https://admin.example.com"],
    "method": ["PUT"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

```bash
gcloud storage buckets update gs://YOUR_BUCKET --cors-file=gcs-cors.json
```

Para desarrollo local, agrega `http://localhost:3001` a los dos listados.

## Permisos

La cuenta de servicio de Cloud Run necesita `roles/storage.objectCreator` en el
bucket y `iam.serviceAccounts.signBlob` para crear las URLs firmadas. Las
imágenes se sirven desde `ALMACEN_GCS_PUBLIC_URL`; configura ese bucket o su CDN
con acceso de lectura público solo si las imágenes deben ser públicas.
