#!/bin/bash
# Cactus TV Linux — hook post-instalación.
# Mantiene el endurecimiento por defecto de electron-builder (SUID condicional
# de chrome-sandbox, perfil AppArmor, alternativas y bases de datos) y añade
# el ajuste de Exec= con la ruta entre comillas por el espacio en "Cactus TV".
set -e

APP_DIR='/opt/Cactus TV'
EXE='cactus-tv'
DESKTOP="/usr/share/applications/$EXE.desktop"

if type update-alternatives >/dev/null 2>&1; then
    if [ -L "/usr/bin/$EXE" ] && [ -e "/usr/bin/$EXE" ] && [ "$(readlink "/usr/bin/$EXE")" != "/etc/alternatives/$EXE" ]; then
        rm -f "/usr/bin/$EXE"
    fi
    update-alternatives --install "/usr/bin/$EXE" "$EXE" "$APP_DIR/$EXE" 100 || ln -sf "$APP_DIR/$EXE" "/usr/bin/$EXE"
else
    ln -sf "$APP_DIR/$EXE" "/usr/bin/$EXE"
fi

# User namespaces disponibles: chrome-sandbox queda 0755 (menos privilegio).
# Sin user namespaces: Electron necesita el helper root:root 4755 para sandbox.
if ! { [[ -L /proc/self/ns/user ]] && unshare --user true; }; then
    chmod 4755 "$APP_DIR/chrome-sandbox" || true
else
    chmod 0755 "$APP_DIR/chrome-sandbox" || true
fi

if hash update-mime-database 2>/dev/null; then
    update-mime-database /usr/share/mime || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi

if [ -f "$DESKTOP" ] && ! grep -q '^Exec="' "$DESKTOP"; then
    sed -i 's|^Exec=\(.*\) %U$|Exec="\1" %U|' "$DESKTOP"
fi

# Perfil AppArmor incluido por electron-builder (Ubuntu 24+). Se omite en
# versiones de AppArmor que no entienden abi/4.0 (p. ej. Ubuntu 22.04).
if apparmor_status --enabled >/dev/null 2>&1; then
    APPARMOR_PROFILE_SOURCE="$APP_DIR/resources/apparmor-profile"
    APPARMOR_PROFILE_TARGET="/etc/apparmor.d/$EXE"
    if apparmor_parser --skip-kernel-load --debug "$APPARMOR_PROFILE_SOURCE" >/dev/null 2>&1; then
        cp -f "$APPARMOR_PROFILE_SOURCE" "$APPARMOR_PROFILE_TARGET"
        if ! { [ -x '/usr/bin/ischroot' ] && /usr/bin/ischroot; } && hash apparmor_parser 2>/dev/null; then
            apparmor_parser --replace --write-cache --skip-read-cache "$APPARMOR_PROFILE_TARGET" || true
        fi
    else
        echo "Skipping the installation of the AppArmor profile as this version of AppArmor does not seem to support the bundled profile"
    fi
fi

exit 0
