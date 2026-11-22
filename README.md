# LM_ReservaSalas — Sistema de Reserva de Salas Universitario

Trabajo final de Bases de Datos. Grupo: **Lara** y **Malagon** (prefijo `LM_`).
Motor: **Oracle AI Database 26ai Free** (instalado en `D:\Oracle`), PDB `FREEPDB1`, puerto 1521.
Base de datos (esquema): **`LM_RESERVASALAS`**.

## Carpetas

| Carpeta | Contenido |
|---|---|
| `01_diseno/` | Diagrama relacional (`.drawio` y `.png`), diccionario de datos (`.xlsx` y `.pdf`) y el generador |
| `02_scripts/` | Scripts SQL y PL/SQL numerados, `instalar_bd.bat`, `backup.bat` |
| `03_backups/` | Respaldos generados: estructura (sin datos) y datos |
| `04_app/` | Aplicación web Node.js + Express (CRUD + reporte de auditoría) |
| `05_pruebas/` | Script de pruebas, salidas y capturas de pantalla |
| `06_documento/` | Documento final en PDF |

## Scripts (`02_scripts/`)

| Script | Qué hace | Conectado como |
|---|---|---|
| `00_crear_base_datos.sql` | Tablespace y esquema `LM_RESERVASALAS` con permisos | SYSTEM |
| `01_crear_tablas.sql` | 8 tablas, PK, FK, UNIQUE, CHECK, DEFAULT, índices, comentarios y trigger de reglas de reserva | LM_RESERVASALAS |
| `02_insertar_datos.sql` | Datos iniciales (más de 10 registros por tabla) | LM_RESERVASALAS |
| `03_auditoria.sql` | Tabla `AUDITORIA`, paquete `PKG_AUDITORIA` y generación automática de triggers `TRG_AUD_*` | LM_RESERVASALAS |
| `04_consulta_auditoria.sql` | Vistas `VW_AUDITORIA`, `VW_AUDITORIA_RESUMEN` y bloque anónimo de reporte por fechas | LM_RESERVASALAS |
| `05_backup_estructura.sql` | Genera un script con solo la estructura (DBMS_METADATA) | LM_RESERVASALAS |
| `06_backup_datos.sql` | Genera un script con solo los datos (INSERTs) | LM_RESERVASALAS |

Instalar todo: ejecutar `02_scripts\instalar_bd.bat`. Respaldos: `02_scripts\backup.bat`.

## Aplicación web

```powershell
cd D:\UNIVERSIDAD\LM_ReservaSalas\04_app
npm install
npm start
```

Abrir <http://localhost:3000>. Escribir el *usuario de la aplicación* arriba a la derecha:
se guarda en la auditoría como "quién" hizo cada cambio.

## Pruebas automáticas (Playwright)

38 pruebas de extremo a extremo en `04_app/tests/e2e`, en dos perfiles: escritorio (1366 px) y celular (375 px).
Usan el Microsoft Edge instalado, así que no hay que descargar navegadores. Requieren Oracle encendido;
la aplicación la arranca Playwright si no está corriendo.

```powershell
cd D:\UNIVERSIDAD\LM_ReservaSalas\04_app
npm run test:e2e
```

| Archivo | Qué comprueba |
|---|---|
| `navegacion.spec.js` | Agenda, todas las tablas del menú con su número de registros, enlaces directos, botón atrás, búsqueda y orden |
| `crud.spec.js` | Insertar, consultar, actualizar y eliminar en facultades, recursos, usuarios, recursos por espacio (PK compuesta) y reservas |
| `tablero.spec.js` | Cambio de día, reservar haciendo clic en un hueco libre, editar desde un bloque, salas en mantenimiento |
| `validaciones.spec.js` | Errores junto a cada campo, resumen enfocable, UNIQUE, doble reserva, capacidad, máximo de horas, llave foránea, usuario obligatorio |
| `auditoria.spec.js` | Inserción, actualización y eliminación registradas con el usuario de la app, detalle antes/después, filtros y CSV |
| `accesibilidad.spec.js` | Análisis axe-core (WCAG 2.2 AA) sin problemas graves, controles de 44 px, teclado y tema oscuro |
| `movil.spec.js` | Sin desplazamiento horizontal, menú tipo cajón y columna de salas fija en el tablero |

Todos los datos que crean las pruebas llevan la marca `E2E` y se borran al terminar. Los registros de auditoría
se conservan porque esa tabla no permite borrar. `npm run test:e2e:ver` muestra el navegador mientras corren y
`npm run test:e2e:reporte` abre el informe HTML.

Las claves están en `04_app/.env` y `04_app/.oracle_sys_password` (no se suben a repositorios).
