# Proyecto 01 — Infraestructura de Active Directory

> **Estado:** en documentación. Sustituye los datos de ejemplo por los resultados de tu laboratorio y añade las capturas antes de presentar el proyecto.

## Resumen

Diseño e implementación de una infraestructura empresarial ficticia basada en **Windows Server 2022** y **Active Directory**. El laboratorio centraliza la administración de usuarios, equipos y recursos de cuatro departamentos: Administración, Dirección, Informática y Recursos Humanos.

## Objetivos

- Crear el dominio corporativo `smr.local`.
- Instalar y configurar Active Directory Domain Services (AD DS) y DNS.
- Administrar usuarios y grupos de seguridad.
- Organizar los equipos y usuarios mediante Unidades Organizativas (OU).
- Unir clientes Windows 11 Pro al dominio.
- Aplicar directivas de grupo (GPO) por departamento.
- Compartir recursos con permisos NTFS adecuados.

## Tecnologías utilizadas

| Área | Tecnología |
| --- | --- |
| Servidor | Windows Server 2022 |
| Clientes | Windows 11 Pro |
| Directorio | Active Directory Domain Services (AD DS) |
| Resolución de nombres | DNS integrado con AD |
| Administración | Active Directory Users and Computers, Group Policy Management |
| Archivos | Carpetas compartidas y permisos NTFS |
| Virtualización | VMware Workstation 17 |

## Arquitectura

```text
                    Internet
                       │
                  VMware NAT
                       │
       Red virtual compartida del laboratorio
       ┌──────────┬────────┬────────┬────────┬──────────┐
       │          │        │        │        │          │
    SRV-DC01   PC-ADM   PC-DIR   PC-INF   PC-RRHH
    AD DS/DNS  Windows 11 Pro unidos a smr.local

Los clientes usan la IP privada de SRV-DC01 como DNS preferido.
```

> Añade una tabla con el direccionamiento real que hayas usado, pero no publiques IP públicas, contraseñas ni claves de producto.

| Equipo | Rol | Sistema operativo | Dirección IP |
| --- | --- | --- | --- |
| SRV-DC01 | Controlador de dominio y DNS | Windows Server 2022 | `[IP privada]` |
| PC-ADM | Cliente Administración | Windows 11 Pro | `[IP privada]` |
| PC-DIR | Cliente Dirección | Windows 11 Pro | `[IP privada]` |
| PC-INF | Cliente Informática | Windows 11 Pro | `[IP privada]` |
| PC-RRHH | Cliente RRHH | Windows 11 Pro | `[IP privada]` |

## Organización de Active Directory

```text
smr.local
│
├── Usuarios
├── Grupos
├── Equipos
│   ├── Administración
│   ├── Dirección
│   ├── Informática
│   └── RRHH
│
├── Administración
├── Dirección
├── Informática
└── RRHH
```

Describe aquí las convenciones que hayas seguido. Por ejemplo, el formato de usuario, el propósito de cada grupo y qué GPO se vincula a cada OU.

## Implementación

### 1. Preparación del servidor

1. Instala Windows Server 2022 en una máquina virtual.
2. Asigna un nombre descriptivo al servidor, por ejemplo `SRV-DC01`.
3. Configura una IP privada estática.
4. Comprueba conectividad y configura el propio servidor como DNS preferido tras instalar el rol.

### 2. AD DS y DNS

1. Instala el rol **Active Directory Domain Services** desde Server Manager.
2. Promueve el servidor a controlador de dominio de un bosque nuevo.
3. Usa el nombre de dominio elegido: `smr.local`.
4. Confirma la instalación de DNS y reinicia cuando el asistente lo solicite.
5. Verifica la zona directa del dominio desde DNS Manager.

### 3. OUs, usuarios y grupos

1. Crea las OUs de usuarios, grupos, equipos y departamentos.
2. Crea los grupos de seguridad necesarios.
3. Añade los usuarios de prueba a sus grupos correspondientes.
4. Mueve los objetos de equipo a la OU de su departamento tras unir los clientes.

### 4. Clientes Windows 11

1. En cada cliente, establece como DNS preferido la IP privada de `SRV-DC01`.
2. Une el equipo a `smr.local` usando una cuenta con permisos.
3. Reinicia e inicia sesión con un usuario de dominio.
4. Comprueba con `whoami`, `gpresult /r` y el acceso a los recursos compartidos.

### 5. GPO y recursos compartidos

Documenta cada política y justifica su alcance. Algunos ejemplos:

- Mapear una unidad de red por departamento.
- Bloquear el acceso al Panel de control para un grupo concreto.
- Definir un fondo de escritorio corporativo.
- Aplicar configuraciones de seguridad o de sesión.

Para recursos compartidos, registra siempre ambos niveles de autorización:

1. Permisos del recurso compartido.
2. Permisos NTFS en la carpeta.

Incluye una tabla con el acceso efectivo que hayas comprobado.

| Recurso | Grupo con acceso | Permiso esperado | Prueba realizada |
| --- | --- | --- | --- |
| `\\SRV-DC01\Administracion` | `[Grupo]` | `[Lectura/Modificar]` | `[Resultado]` |
| `\\SRV-DC01\RRHH` | `[Grupo]` | `[Lectura/Modificar]` | `[Resultado]` |

## Incidencia: relación de confianza rota

### Síntoma

Al iniciar sesión o acceder al dominio, el cliente puede mostrar un mensaje equivalente a:

> The security database on the server does not have a computer account for this workstation trust relationship.

### Diagnóstico

La cuenta del equipo y la contraseña que el cliente mantiene con Active Directory ya no coinciden. Antes de corregirlo, se comprobó:

- Que el cliente usaba el DNS del controlador de dominio.
- Que la fecha y hora eran correctas.
- Que el objeto del equipo existía y estaba habilitado en Active Directory.
- Que había conectividad con el controlador de dominio.

### Solución

Registra el método que haya funcionado en tu entorno:

1. Reparar el canal seguro desde el cliente con una herramienta adecuada, por ejemplo `Test-ComputerSecureChannel -Repair` o `Reset-ComputerMachinePassword`, **o**
2. Sacar el cliente del dominio, usar un grupo de trabajo temporal, reiniciar y volver a unirlo al dominio.

Restablecer la cuenta de equipo desde Active Directory rompe el canal existente y exige volver a unir el cliente; no basta con reiniciarlo. Recrear la máquina virtual debe ser el último recurso: documentar una reparación más pequeña demuestra mejor criterio de resolución de incidencias.

## Evidencias que añadir

Guarda las capturas en [`imagenes/`](./imagenes/) con nombres claros y sin información sensible:

1. `01-active-directory-ous-usuarios.png`
2. `02-dns-zona-smr-local.png`
3. `03-gpo-departamento.png`
4. `04-cliente-unido-dominio.png`
5. `05-permisos-ntfs.png`
6. `06-inicio-sesion-dominio.png`
7. `07-vmware-laboratorio.png`

Para cada captura, explica qué se observa y qué requisito verifica. No incluyas imágenes solo por decoración.

## Resultados

Completa esta sección al terminar las pruebas:

- [ ] Dominio `smr.local` operativo.
- [ ] Usuarios, grupos y OUs creados.
- [ ] Clientes unidos al dominio.
- [ ] GPO aplicadas y verificadas.
- [ ] Recursos compartidos accesibles únicamente por los grupos autorizados.
- [ ] Incidencias y solución documentadas.

## Habilidades demostradas

- Administración de Windows Server.
- Active Directory y DNS.
- Organización de identidades mediante OUs y grupos.
- Directivas de grupo (GPO).
- Permisos NTFS y recursos compartidos.
- Redes Windows y resolución de incidencias.
- Virtualización con VMware Workstation.

## Próximas mejoras

- [ ] DHCP integrado en el laboratorio.
- [ ] Perfiles móviles y carpetas personales.
- [ ] Impresoras de red.
- [ ] File Server Resource Manager (FSRM).
- [ ] Windows Server Backup.
- [ ] Windows Server Update Services (WSUS).
- [ ] Segundo controlador de dominio para probar redundancia.
