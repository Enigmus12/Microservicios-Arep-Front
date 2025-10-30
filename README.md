# Microservicios-Arep-Front — Frontend mínimo 

Este repositorio contiene un frontend React (TypeScript) simplificado para el ejercicio del curso. Está preparado para trabajar con autenticación OIDC (Amazon Cognito en mi caso) usando `react-oidc-context` y para integrarse con un backend Spring Boot que expone los endpoints REST bajo `/api`.

Contenido y propósito
- Interfaz mínima para ver un "stream" de posts y crear posts de hasta 140 caracteres.
- Autenticación OIDC via `react-oidc-context` (configurable por variables de entorno).
- Conexión al backend (endpoints REST) con fallback a `localStorage` cuando el backend no esté disponible.

Requisitos
- Node 18+ y npm (u otro manejador compatible con los scripts en `package.json`).

Instalación

Windows PowerShell:

```powershell
npm install
```

Variables de entorno (opcional)

El frontend acepta las siguientes variables de entorno (prefijo REACT_APP_):

- REACT_APP_OIDC_AUTHORITY — URL del proveedor OIDC (ej. Cognito authority)
- REACT_APP_OIDC_CLIENT_ID — Client ID del app client de Cognito
- REACT_APP_API_BASE — Base URL del API (por ejemplo `http://localhost:8080/api`). Si no se suministra, el front usa `http://localhost:8080/api` por defecto.

Puedes exportarlas en PowerShell antes de ejecutar la app o agregarlas a un archivo `.env` en la raíz del proyecto:

PowerShell (temporal):

```powershell
$env:REACT_APP_OIDC_AUTHORITY='https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXX'
$env:REACT_APP_API_BASE='http://localhost:8080/api'
npm start
```

Desarrollo

```powershell
npm start
```

Build para producción

```powershell
npm run build
```

El mensaje "Failed to fetch" en el navegador suele indicar problemas de red que impiden que la llamada HTTP llegue al backend.


