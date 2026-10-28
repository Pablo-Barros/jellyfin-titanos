# Jellyfin para Titan OS (no oficial)

Lanzador HTML5 para televisores con Titan OS (Philips, JVC, Sharp…). Guarda tus
servidores Jellyfin y abre la interfaz web que sirve cada servidor (`/web`).

No es un proyecto oficial de Jellyfin.

## Funciones

- Añadir, recordar y quitar servidores; prueba el puerto 8096 si no se indica.
- Abre automáticamente el último servidor al iniciar.
- Navegación con el mando (flechas, OK) y tecla Atrás (8 Philips / 461 JVC).
- Diálogo de confirmación al salir desde la pantalla principal.
- Interfaz en inglés y español según el idioma del televisor (inglés por defecto).

## Probar en local

```bash
python -m http.server 8765
```

Abre http://127.0.0.1:8765/ y usa las flechas, Intro y Escape (Atrás).

## Licencia

Código bajo licencia MIT. El logotipo de Jellyfin es del proyecto Jellyfin
([jellyfin-ux](https://github.com/jellyfin/jellyfin-ux)) y se usa bajo licencia CC BY-SA 4.0.
