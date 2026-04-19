# Llaves JWT

Esta carpeta contiene el par de llaves RSA que se usan para firmar y verificar
los tokens JWT del sistema.

## Archivos (NO estan en el repositorio)

- `jwt-private.pem`: llave privada. Solo backend-negocio la usa para FIRMAR
  tokens cuando un usuario hace login o pide un refresh.
- `jwt-public.pem`: llave publica. La usan backend-negocio y backend-iot para
  VERIFICAR la firma de los tokens que reciben.

Ambos archivos estan ignorados por `.gitignore`. Cada desarrollador debe
generar su propio par de llaves localmente.

## Como generar las llaves

Desde el root del proyecto, corre el script una sola vez:

```bash
bash infra/scripts/generate-jwt-keys.sh
```

Si las llaves ya existen te va a preguntar antes de sobreescribirlas.

## Como se usan en Docker

El `docker-compose.yml` monta los archivos como volumenes de solo lectura:

- **backend-negocio** recibe ambas llaves (privada y publica).
- **backend-iot** recibe SOLO la llave publica. Es una medida de seguridad:
  si alguien compromete el contenedor de IoT, no va a poder firmar tokens
  falsos porque fisicamente no tiene acceso a la llave privada.

## Rotar las llaves

Para rotar las llaves (por ejemplo, si sospechas que se filtraron):

1. Corre el script de nuevo y confirma sobreescribir.
2. Reinicia ambos backends (`docker-compose restart backend-negocio backend-iot`).
3. Los usuarios van a tener que hacer login de nuevo porque los tokens
   firmados con la llave anterior ya no van a ser validos.
