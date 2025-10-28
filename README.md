# Simustream Shopify Backend

Backend API para la integración de Shopify con Simustream. Este servicio maneja webhooks de Shopify y sincroniza productos entre la tienda Shopify y la plataforma Simustream.

## Descripción

Este proyecto es un servidor Express.js que actúa como intermediario entre Shopify y la API de Simustream. Gestiona automáticamente la sincronización de productos mediante webhooks cuando se agregan, actualizan o eliminan productos en la tienda Shopify.

## Características

- Servidor HTTPS con certificados SSL
- Soporte CORS para solicitudes cross-origin
- Webhooks de Shopify para sincronización automática:
  - Agregar productos
  - Actualizar productos
  - Eliminar productos
- Integración con Stripe para pagos
- Autenticación OAuth de Shopify

## Requisitos Previos

- Node.js (v12 o superior)
- npm o yarn
- Certificados SSL (Let's Encrypt)
- Cuenta de Shopify con acceso a API
- Cuenta de Stripe
- Acceso a la API de Simustream

## Instalación

1. Clona el repositorio:
```bash
git clone <repository-url>
cd simustream-strut-shopify
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura los certificados SSL:
   - Asegúrate de tener los certificados en `/etc/letsencrypt/live/shopify.bebettertest.net/`
   - Los archivos necesarios son: `privkey.pem`, `cert.pem`, `chain.pem`

4. Configura las variables de entorno:
```bash
cp config/settings-template.json config/settings.json
```

5. Edita `config/settings.json` con tus credenciales:
```json
{
    "base_path": "https://api-v1.simustream.com",
    "redirect_dashboard_url": "https://simustream.com",
    "store_forwarding_address": "https://store.simustream.com",
    "stripe_secret_key": "YOUR_STRIPE_LIVE_SECRET_KEY",
    "stripe_secret_test_key": "YOUR_STRIPE_TEST_SECRET_KEY",
    "shopify_secret_key": "YOUR_SHOPIFY_SECRET_KEY",
    "shopify_api_key": "YOUR_SHOPIFY_API_KEY",
    "webhook_address": "https://store.simustream.com"
}
```

## Uso

### Desarrollo

```bash
npm start
```

El servidor se iniciará en:
- Puerto 80 (HTTP)
- Puerto 443 (HTTPS)

### Producción con PM2

El proyecto incluye configuración para PM2:

```bash
pm2 start pm2_processes.yml
pm2 save
pm2 startup
```

## Estructura del Proyecto

```
simustream-strut-shopify/
├── config/
│   ├── settings.json           # Configuración del proyecto (no incluido en git)
│   └── settings-template.json  # Plantilla de configuración
├── controllers/
│   └── v1/
│       ├── app.js              # Controladores de la aplicación
│       └── shopify.js          # Controladores de Shopify
├── lib/
│   └── middleware/
│       └── common.js           # Funciones comunes
├── public/                     # Archivos estáticos
├── index.js                    # Punto de entrada principal
├── store.js                    # Lógica del store
├── pm2_processes.yml           # Configuración de PM2
└── package.json                # Dependencias del proyecto
```

## Endpoints API

### Webhooks

#### POST /add-product-webhook
Webhook para agregar un nuevo producto desde Shopify.

**Headers:**
- `x-shopify-shop-domain`: Dominio de la tienda Shopify

**Body:**
```json
{
  "product_listing": {
    // Datos del producto de Shopify
  }
}
```

#### POST /update-product-webhook
Webhook para actualizar un producto existente.

**Headers:**
- `x-shopify-shop-domain`: Dominio de la tienda Shopify

**Body:**
```json
{
  "product_listing": {
    // Datos actualizados del producto
  }
}
```

#### POST /delete-product-webhook
Webhook para eliminar un producto de la tienda.

**Headers:**
- `x-shopify-shop-domain`: Dominio de la tienda Shopify

**Body:**
```json
{
  "product_listing": {
    "product_id": "ID_del_producto"
  }
}
```

### Otros Endpoints

Ver archivos en `controllers/v1/` para endpoints adicionales relacionados con:
- Autenticación OAuth de Shopify
- Gestión de aplicaciones
- Operaciones específicas de la tienda

## Configuración de Webhooks en Shopify

1. Accede al panel de administración de Shopify
2. Ve a Settings > Notifications > Webhooks
3. Agrega los siguientes webhooks:
   - **Product listing added**: `https://tu-dominio.com/add-product-webhook`
   - **Product listing updated**: `https://tu-dominio.com/update-product-webhook`
   - **Product listing removed**: `https://tu-dominio.com/delete-product-webhook`

## Dependencias Principales

- **express**: Framework web para Node.js
- **axios**: Cliente HTTP
- **body-parser**: Middleware para parsear cuerpos de solicitudes
- **dotenv**: Gestión de variables de entorno
- **stripe**: SDK de Stripe para pagos
- **@shopify/polaris**: Componentes UI de Shopify
- **request-promise**: Cliente HTTP con promesas

## Seguridad

- Usa HTTPS para todas las comunicaciones
- Los certificados SSL se actualizan automáticamente con Let's Encrypt
- Las credenciales sensibles se almacenan en `config/settings.json` (no incluido en git)
- CORS configurado para permitir solicitudes desde dominios específicos

## Solución de Problemas

### Error de certificados SSL
Si recibes errores relacionados con certificados SSL, verifica:
1. Los certificados existen en la ruta especificada
2. Los permisos de lectura son correctos
3. Los certificados no han expirado

### Error de conexión con API de Simustream
Verifica:
1. La URL de `base_path` en `settings.json` es correcta
2. El servidor de Simustream está accesible
3. Las credenciales de autenticación son válidas

### Webhooks no funcionan
Verifica:
1. Los webhooks están correctamente configurados en Shopify
2. La URL del webhook es accesible públicamente
3. Los headers `x-shopify-shop-domain` se están enviando correctamente

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

ISC
