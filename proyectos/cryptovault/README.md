# CryptoVault

Dashboard de monitoreo de posiciones DeFi en tiempo real, sin backend propio: lee directamente de la blockchain desde el navegador.

**Demo:** [`../cryptovault/`](./index.html) dentro de este portfolio.

## Objetivo

Añadir direcciones de wallet (Ethereum y Solana) y ver en tiempo real:

- Posiciones de liquidez concentrada en **Uniswap V3** (Ethereum), **Orca Whirlpool** y **Raydium CLMM** (Solana): par de tokens, rango de precio, dentro/fuera de rango, fees pendientes y valor estimado en USD.
- Balances de wallet (ETH, SOL, tokens SPL).
- Un mapa de flujo que visualiza qué wallets alimentan qué posiciones.
- Control de acceso: un propietario y una lista de correos autorizados para ver el portafolio en modo lectura.

## Arquitectura

```
Wallet del usuario (dirección pública)
        │
        ▼
CryptoVault (una sola página HTML, corre en el navegador)
        │
        ├── RPC Ethereum público  → contrato NonfungiblePositionManager (Uniswap V3)
        ├── RPC Helius            → getProgramAccounts + memcmp (Orca Whirlpool / Raydium CLMM)
        └── API CoinGecko         → precios en USD
```

No hay servidor propio ni base de datos externa. El estado (propietario, accesos, wallets) se guarda con `window.storage` cuando se usa dentro de Claude, o con `localStorage` cuando se despliega de forma independiente (como aquí, en GitHub Pages).

## Tecnologías

- HTML / CSS / JavaScript vanilla (sin frameworks, sin build)
- JSON-RPC de Ethereum (`eth_call`) con codificación/decodificación ABI escrita a mano
- JSON-RPC de Solana, con decodificación binaria (Borsh) de cuentas de programa
- [Helius](https://helius.dev) como proveedor de RPC para Solana
- API pública de CoinGecko para precios

## Decisiones técnicas destacadas

- **Sin SDKs de terceros**: en vez de `ethers.js` o `@solana/web3.js`, las llamadas se construyen a mano (selectores de función conocidos, codificación de parámetros, decodificación de la respuesta). Esto evita depender de paquetes npm que no se pueden cargar de forma fiable en todos los entornos.
- **Localizar posiciones sin derivar PDAs**: para Orca y Raydium, en vez de calcular direcciones de cuenta con criptografía de curva elíptica (arriesgado sin poder probarlo en producción), se usa `getProgramAccounts` con un filtro `memcmp` que le pide directamente al RPC "la cuenta cuyo NFT de posición sea este".
- **Verificación contra fuente real**: el formato binario de las cuentas de Orca y Raydium se extrajo y verificó contra el código fuente público de cada protocolo en GitHub, no se adivinó.

## Instalación / uso local

No requiere instalación. Es un único archivo `index.html` con todo el CSS y JS embebido.

1. Abre la página.
2. El primer correo que introduzcas te convierte en propietario.
3. (Opcional, para posiciones LP de Solana) Añade tu API key gratuita de [helius.dev](https://helius.dev) en el botón **Solana**.
4. Añade tus direcciones de wallet.

## Problemas encontrados

### 1. Almacenamiento no disponible fuera de Claude

**Síntoma:** error `Storage set failed: Internal server error` al guardar la lista de accesos.
**Causa:** `window.storage` es una API exclusiva del entorno de artifacts de Claude; no existe en un sitio publicado de forma independiente.
**Solución:** detección automática de entorno con fallback a `localStorage` del navegador cuando `window.storage` no está disponible.

### 2. Las wallets no cargaban datos

**Síntoma:** error genérico "No se pudo leer esta wallet" para todas las direcciones, en cualquier red.
**Causa:** la vista previa de artifacts de Claude.ai ejecuta el código en un sandbox que bloquea peticiones de red salientes a dominios externos (RPCs, APIs) por seguridad.
**Solución:** confirmado que la app funciona correctamente al desplegarla fuera de ese sandbox, en un navegador con acceso normal a internet (como GitHub Pages).

## Próximos pasos

- Backend real (p. ej. Firebase) para que el control de acceso funcione entre varios dispositivos/personas de verdad.
- Histórico de valor y APR mediante un indexador propio.
- Soporte a más DEXs y protocolos.

---
Proyecto creado por **Adan Castillo** como parte de mi portafolio de Sistemas Microinformáticos y Redes (SMR).
