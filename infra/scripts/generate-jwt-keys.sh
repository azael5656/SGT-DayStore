#!/usr/bin/env bash
# =============================================================================
# generate-jwt-keys.sh
# -----------------------------------------------------------------------------
# Genera el par de llaves RSA (privada y publica) que se usan para firmar y
# verificar los tokens JWT del proyecto.
#
# - La llave privada (jwt-private.pem) solo la usa backend-negocio para FIRMAR
#   tokens cuando un usuario hace login o refresh.
# - La llave publica (jwt-public.pem) la usan AMBOS backends para VERIFICAR
#   que el token recibido realmente fue firmado por backend-negocio.
#
# Este script se corre UNA sola vez, antes del primer "docker-compose up".
# Si las llaves ya existen, pregunta antes de sobreescribir.
#
# Uso:
#   bash infra/scripts/generate-jwt-keys.sh
# =============================================================================

set -e

# Directorio donde se guardan las llaves (ruta relativa al root del proyecto).
KEYS_DIR="$(dirname "$0")/../keys"
PRIVATE_KEY_PATH="$KEYS_DIR/jwt-private.pem"
PUBLIC_KEY_PATH="$KEYS_DIR/jwt-public.pem"

# Nos aseguramos de que la carpeta exista.
mkdir -p "$KEYS_DIR"

# Si ya existen, confirmamos con el usuario para no borrar algo util sin querer.
if [ -f "$PRIVATE_KEY_PATH" ] || [ -f "$PUBLIC_KEY_PATH" ]; then
  echo "Ya existen llaves en $KEYS_DIR."
  read -p "Quieres sobreescribirlas? [s/N]: " respuesta
  if [ "$respuesta" != "s" ] && [ "$respuesta" != "S" ]; then
    echo "Cancelado. Las llaves no se modificaron."
    exit 0
  fi
fi

echo "Generando llave privada RSA de 2048 bits..."
openssl genrsa -out "$PRIVATE_KEY_PATH" 2048

echo "Extrayendo llave publica..."
openssl rsa -in "$PRIVATE_KEY_PATH" -pubout -out "$PUBLIC_KEY_PATH"

# Permisos restrictivos para la llave privada (solo el dueno puede leerla).
chmod 600 "$PRIVATE_KEY_PATH"
chmod 644 "$PUBLIC_KEY_PATH"

echo ""
echo "Listo. Llaves generadas en:"
echo "  - $PRIVATE_KEY_PATH"
echo "  - $PUBLIC_KEY_PATH"
echo ""
echo "Recuerda: la llave privada NUNCA se sube al repositorio."
