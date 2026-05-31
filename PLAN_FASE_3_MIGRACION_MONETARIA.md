# Plan técnico Fase 3: migración monetaria

## Objetivo

Migrar el modelo persistido para dejar de depender de columnas y defaults rígidos a USD/VES sin romper históricos ni tiendas existentes.

## Problema actual

El esquema actual sigue anclado a estos campos legacy:

- `products.priceUSD`
- `products.priceVES`
- `sale_items.priceUSD`
- `accounts_receivable.baseAmountUSD`
- `accounts_payable.baseAmountUSD`
- defaults como `baseCurrency = 'VES'`
- tasas guardadas con `fromCurrency = 'USD'` y `toCurrency = 'VES'`

Esto funciona para Venezuela, pero fuerza un modelo dual incluso en tiendas que operan sólo con moneda local.

## Criterios de diseño

1. No romper lectura de datos históricos.
2. Mantener compatibilidad temporal con columnas legacy.
3. Persistir snapshot de moneda y tasa al momento de crear cada registro.
4. Permitir tiendas sin tasa activa.
5. Mantener a Venezuela operando como hasta hoy mientras conviven ambos modelos.

## Modelo objetivo propuesto

### Productos

Mantener durante transición:

- `priceUSD`
- `priceVES`

Agregar:

- `basePrice`
- `baseCurrency`
- `localPrice`
- `localCurrency`
- `referencePrice`
- `referenceCurrency`
- `exchangeRateSnapshot`
- `pricingMode`

Regla:

- Tienda sin USD: `baseCurrency = localCurrency`, `referencePrice = null`, `pricingMode = 'local_only'`
- Tienda con USD: `baseCurrency = referenceCurrency`, `localPrice` calculado con snapshot de tasa, `pricingMode = 'dual_reference_local'`

### Ventas y sale_items

Mantener durante transición:

- `sale_items.priceUSD`

Agregar:

- `sales.localCurrency`
- `sales.referenceCurrency`
- `sales.exchangeMode`
- `sales.exchangeRateSnapshot`
- `sales.totalLocal`
- `sales.totalReference`
- `sale_items.unitPriceBase`
- `sale_items.unitPriceBaseCurrency`
- `sale_items.unitPriceLocal`
- `sale_items.unitPriceReference`
- `sale_items.lineTotalLocal`
- `sale_items.lineTotalReference`

### Cuentas por cobrar y pagar

Mantener durante transición:

- `baseAmountUSD`

Agregar:

- `baseAmount`
- `baseCurrency`
- `localAmount`
- `localCurrency`
- `referenceAmount`
- `referenceCurrency`
- `exchangeMode`
- `exchangeRateSnapshot`

Regla:

- Para tienda local_only, `referenceAmount = null` y `exchangeMode = 'disabled'`
- Para tienda dual, `referenceAmount` guarda el monto en USD si la obligación nació en referencia

### Tabla de tasas

Mantener:

- `rate`

Generalizar:

- `fromCurrency`
- `toCurrency`
- `mode`
- `source`
- `isActive`

Regla:

- Venezuela: `USD -> VES`, `mode = official_ve`
- Otros países con USD: `USD -> monedaLocal`, `mode = manual`
- Otros países sin USD: no se requiere tasa activa

## Estrategia de rollout

### Etapa 1. Lectura compatible

- Agregar columnas nuevas sin borrar legacy.
- Leer nuevas columnas si existen.
- Si no existen, derivar desde legacy.

### Etapa 2. Escritura dual

- Al crear o editar productos, ventas y cuentas, escribir tanto columnas nuevas como legacy.
- Esto permite rollback funcional sin perder interoperabilidad.

### Etapa 3. Backfill

- Backfill de productos desde `priceUSD`, `priceVES` y settings activos.
- Backfill de ventas desde `sale_items.priceUSD`, `sales.exchangeRate` y `sales.total`.
- Backfill de cuentas desde `baseCurrency`, `baseAmountUSD`, `amount`, `exchangeRateAtCreation`.

### Etapa 4. Lectura preferente nueva

- Las pantallas usan primero columnas nuevas.
- Las legacy quedan sólo como fallback.

### Etapa 5. Deprecación real

- Cuando toda la app y los reportes lean el modelo nuevo, evaluar retiro de campos legacy en una migración posterior.

## Archivos a intervenir

- `src/services/database/db.js`
- `src/services/database/products.js`
- `src/services/database/sales.js`
- `src/services/database/accounts.js`
- `src/services/database/exchangeRates.js`

## Riesgos

- Recalcular mal montos históricos si se asume que todas las cuentas usan USD de referencia.
- Duplicar fuentes de verdad si se escribe en nuevo modelo pero no se sincroniza el legacy temporal.
- Romper resúmenes/reportes que aún lean `priceVES`, `priceUSD` o `baseAmountUSD` directo.

## Orden recomendado de implementación

1. Definir columnas nuevas en `db.js`.
2. Adaptar servicios de lectura/escritura de cuentas.
3. Adaptar servicios de productos.
4. Adaptar ventas y `sale_items`.
5. Adaptar tabla de tasas.
6. Ejecutar backfill y validación.

## Validaciones mínimas

- Tienda VE dual: sigue leyendo y escribiendo igual que hoy.
- Tienda CO local_only: crea producto y cuenta sin `referenceAmount` ni tasa.
- Tienda CO dual: crea producto y cuenta con `USD -> COP` manual.
- Históricos viejos siguen visibles sin migración destructiva.
