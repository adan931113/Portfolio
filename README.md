# Mi portafolio de Sistemas y Redes

Este repositorio reúne mis laboratorios de administración de sistemas, redes y virtualización. Está pensado para mostrar no solo el resultado de cada práctica, sino también el diseño, la documentación, las incidencias y la forma de resolverlas.

> Antes de publicar, sustituye los textos entre corchetes (por ejemplo, `[Tu nombre]`) por tus datos.

## Contenido

- [Inicio](./index.html): presentación, habilidades y hoja de ruta.
- [Proyecto 1 — Active Directory](./proyectos/active-directory/README.md): laboratorio de Windows Server 2022, AD DS, DNS y GPO.

## Estructura

```text
.
├── index.html                         # Página principal para GitHub Pages
├── assets/
│   ├── css/styles.css                 # Diseño compartido
│   └── img/                           # Imágenes generales del portafolio
└── proyectos/
    └── active-directory/
        ├── index.html                 # Vista web del proyecto
        ├── README.md                  # Documentación técnica completa
        └── imagenes/                  # Capturas del laboratorio
```

## Ver la web en tu equipo

Puedes abrir `index.html` directamente en el navegador. Si tienes Python instalado, también puedes iniciar un servidor local desde la carpeta del repositorio:

```powershell
python -m http.server 8000
```

Después abre `http://localhost:8000`.

## Publicar con GitHub Pages

1. Crea en GitHub un repositorio llamado `portfolio` o `mi-portafolio`.
2. Inicializa Git en esta carpeta y sube los archivos:

   ```powershell
   git init -b main
   git add .
   git commit -m "Crear portafolio inicial"
   git remote add origin https://github.com/[tu-usuario]/[nombre-del-repositorio].git
   git push -u origin main
   ```

3. En GitHub, abre **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**, la rama `main` y la carpeta `/(root)`.
5. Guarda los cambios. Tu web quedará disponible en `https://[tu-usuario].github.io/[nombre-del-repositorio]/`.

## Añadir un proyecto nuevo

1. Crea una carpeta dentro de `proyectos/`.
2. Añade un `README.md` con objetivo, arquitectura, tecnologías, procedimiento, incidencias y resultados.
3. Guarda las capturas numeradas en su carpeta `imagenes/`.
4. Añade una tarjeta en `index.html` para enlazarlo desde la portada.

Mantén las capturas sin datos personales, contraseñas, direcciones IP públicas ni claves de producto.
