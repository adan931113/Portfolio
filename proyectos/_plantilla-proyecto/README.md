# Plantilla de proyecto

Copia esta carpeta para cada nuevo laboratorio/proyecto (DHCP, Linux Server, Docker...) y mantén el mismo diseño del portfolio sin tocar `styles.css`.

## Cómo usarla

1. Duplica la carpeta `proyectos/_plantilla-proyecto/` y renómbrala con el slug del proyecto, por ejemplo `proyectos/dhcp/`.
2. Abre su `index.html` y rellena cada `[texto entre corchetes]` — son los únicos sitios que debes tocar. No cambies las clases (`section-kicker`, `summary-strip`, `architecture-node`, `check-list`, `tag-list`, `document-list`, `callout`, `capture-grid`...): son las que ya usa el resto del portfolio.
3. Ajusta el número de nodos en `.architecture` según necesites (puedes añadir o quitar `architecture-node`).
4. Añade tus capturas en `imagenes/` y actualiza los `capture-placeholder` si quieres enlazarlas directamente con `<img>`.
5. Rellena el `README.md` de esta misma carpeta (cópialo también) con la documentación técnica completa.
6. Cuando el proyecto esté listo, añade manualmente una tarjeta `.project-card` en la sección `#proyectos` del `index.html` raíz del portfolio, apuntando a `proyectos/tu-proyecto/`. Esto no lo hace la plantilla — es la única parte que se edita fuera de esta carpeta.

## Qué no cambiar

- La ruta al CSS (`../../assets/css/styles.css`) — siempre a dos niveles de la raíz.
- Las clases CSS existentes — están definidas globalmente en `assets/css/styles.css` y las comparte todo el portfolio.
- La estructura de secciones (Arquitectura → Objetivos → Tecnologías → Documentación → Incidencia → Evidencias → Siguiente mejora) — mantenerla igual en todos los proyectos da consistencia al portfolio completo.
