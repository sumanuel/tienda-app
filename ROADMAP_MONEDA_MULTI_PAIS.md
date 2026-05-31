# Roadmap de soporte multi-pais y moneda local

## Estado general

- Estado: En planificacion
- Prioridad: Alta
- Objetivo: quitar el acoplamiento fijo a USD/VES sin romper el flujo actual de Venezuela.
- Regla principal: Venezuela conserva su comportamiento actual; otros paises solo usan conversion USD si la tienda lo activa.

## Decision funcional aprobada

La app tendra 3 modos operativos reales:

1. Venezuela con conversion USD -> VES

- Mantiene el comportamiento actual.
- Usa tasa de cambio activa.
- Conserva consulta oficial/manual y todos los flujos asociados.

2. Otro pais sin conversion USD

- La app opera solo en moneda local.
- No se muestran tasa, equivalencias ni conversores.
- Costos, precios, ventas, cuentas y reportes viven en una sola moneda.

3. Otro pais con conversion USD -> moneda local

- La app opera en modo dual.
- La moneda local depende del pais registrado.
- No se consulta tasa oficial venezolana.
- La tasa se maneja manualmente o con una fuente futura especifica para ese pais si luego se decide.

## Reglas de negocio congeladas

- Si el pais de la tienda es Venezuela, la moneda local es VES.
- Si el pais de la tienda no es Venezuela, la moneda local se resuelve automaticamente por nomenclatura del pais, por ejemplo COP para Colombia.
- El pais no obliga por si solo el uso de USD.
- La tienda debe definir en onboarding si usara USD para costos o precios.
- Si la tienda no usa USD, la app no debe mostrar ninguna UI relacionada con tasa, equivalencias o conversiones.
- El comportamiento especial de consulta frecuente del dolar oficial solo aplica a Venezuela.

## Modelo objetivo de configuracion

Se agregan o normalizan estas claves en configuracion de tienda:

- `business.countryCode`
- `business.countryName`
- `business.defaultDialCode`
- `pricing.localCurrency`
- `pricing.referenceCurrency`
- `pricing.usesUsdConversion`
- `exchange.mode` con valores:
  - `official_ve`
  - `manual`
  - `disabled`
- `exchange.source`
- `exchange.lastConfiguredAt`

Reglas derivadas:

- Venezuela + usa USD = `localCurrency = VES`, `referenceCurrency = USD`, `usesUsdConversion = true`, `exchange.mode = official_ve`
- Otro pais + usa USD = `localCurrency = moneda del pais`, `referenceCurrency = USD`, `usesUsdConversion = true`, `exchange.mode = manual`
- Otro pais + no usa USD = `localCurrency = moneda del pais`, `usesUsdConversion = false`, `exchange.mode = disabled`

## Fases y seguimiento

### Fase 0. Alinear dominio y contratos

- Estado: Completada
- Objetivo: definir el contrato tecnico final antes de tocar esquema o pantallas.

Entregables:

- Documento de decision final de modos operativos.
- Lista de settings nuevos y deprecated.
- Lista de campos actuales que quedan obsoletos por estar rigidos a USD/VES.

Checklist:

- [x] Confirmar si `referenceCurrency` quedara fija en USD.
- [x] Confirmar si Venezuela sin USD se soportara ahora o en una iteracion futura.
- [x] Confirmar si productos se almacenaran por moneda base + snapshot local, o por doble precio persistido.
- [x] Confirmar si cuentas y ventas historicas deben conservar snapshot de moneda y tasa al momento de crear.

Cierre de fase:

- Contrato de datos aceptado y sin ambiguedades.

Decisiones cerradas en esta fase:

- `referenceCurrency` queda fija en USD para esta iniciativa.
- Venezuela sin USD no se implementa en esta etapa; se mantiene el flujo actual.
- Productos siguen en esquema legacy durante Fase 1 y Fase 2; la migración de persistencia queda para Fase 3.
- Ventas y cuentas históricas deberán conservar snapshot de moneda y tasa al momento de crear.

### Fase 1. Onboarding y configuracion por pais

- Estado: Completada
- Objetivo: capturar pais de registro y decision sobre uso de USD.

Entregables:

- Onboarding con selector de pais.
- Resolucion automatica de moneda local segun pais.
- Pregunta explicita: "Usaras USD para calcular costos o precios?"
- Configuracion persistida en settings y store.

Pantallas y modulos impactados:

- `src/screens/main/OnboardingScreen.js`
- `src/screens/main/BusinessSettingsScreen.js`
- `src/services/database/settings.js`
- `src/services/store/storeCollaborationService.js`
- `src/components/common/PhoneInput.js`
- `src/utils/whatsapp.js`

Checklist:

- [x] Guardar `countryCode` y `countryName` de la tienda.
- [x] Resolver `localCurrency` automaticamente desde pais.
- [x] Resolver prefijo telefonico por pais.
- [x] Persistir `usesUsdConversion`.
- [x] Asignar `exchange.mode` automaticamente segun pais y eleccion del usuario.

Cierre de fase:

- Una tienda nueva queda configurada sin asumir Venezuela por defecto.

Implementado en:

- `src/constants/countryMetadata.js`
- `src/services/database/settings.js`
- `src/components/common/CountrySelectField.js`
- `src/components/common/PhoneInput.js`
- `src/screens/main/OnboardingScreen.js`
- `src/screens/main/BusinessSettingsScreen.js`

### Fase 2. Capa monetaria centralizada

- Estado: En progreso
- Objetivo: sacar de utilidades y componentes toda logica binaria USD/VES.

Entregables:

- Helper unico de formateo monetario por `currencyCode`.
- Helper unico de conversion genrica `fromCurrency -> toCurrency`.
- Resolver moneda local, moneda de referencia y si hay conversion desde settings activos.
- API de visibilidad para ocultar o mostrar UI de tasa.

Modulos impactados:

- `src/constants/currencies.js`
- `src/utils/currency.js`
- `src/utils/exchange.js`
- `src/components/pricing/MultiCurrencyPrice.js`
- `src/contexts/ExchangeRateContext.js`

Checklist:

- [ ] Eliminar helpers especificos `USD -> VES` y `VES -> USD` como unica via.
- [x] Crear selector central tipo `getCurrencyBehavior(settings)`.
- [x] Permitir `formatCurrency(amount, localCurrency)` sin defaults a VES.
- [x] Desacoplar `ExchangeRateContext` del supuesto Venezuela.

Avance actual:

- Se amplió el catálogo base de monedas soportadas para formateo.
- `currency.js` y `exchange.js` ya resuelven comportamiento monetario desde settings activos.
- `ExchangeRateContext` ahora expone `localCurrency`, `referenceCurrency`, `exchangeMode` y `rateEnabled`.
- La pantalla de tasa y el convertidor dejaron de asumir VES/USD en su UI principal.
- Formularios y listados principales de cuentas ya respetan `localCurrency`, `referenceCurrency` y si la tienda usa o no USD.

Cierre de fase:

- La app puede resolver comportamiento monetario segun configuracion sin usar condicionales dispersos por pantalla.

### Fase 3. Esquema de datos y migraciones

- Estado: En planificacion
- Objetivo: dejar de persistir el modelo como si siempre existieran USD y VES.

Entregables:

- Plan de migracion SQLite y cloud.
- Campos nuevos para snapshot de moneda y tasa.
- Compatibilidad temporal con campos legacy.

Superficie afectada:

- `src/services/database/db.js`
- `src/services/database/products.js`
- `src/services/database/sales.js`
- cuentas por cobrar y pagar

Campos legacy a revisar:

- `priceUSD`
- `priceVES`
- `baseAmountUSD`
- defaults `baseCurrency = VES`
- campos de tasa asumidos solo para USD/VES

Checklist:

- [ ] Definir estructura nueva para productos.
- [ ] Definir estructura nueva para ventas y sale_items.
- [ ] Definir estructura nueva para cuentas por cobrar y pagar.
- [ ] Crear backfill para historicos.
- [ ] Mantener lectura backward compatible durante rollout.

Documento tecnico asociado:

- `PLAN_FASE_3_MIGRACION_MONETARIA.md`

Cierre de fase:

- El esquema soporta moneda local dinamica y modo simple sin conversion.

### Fase 4. Refactor funcional por modulos

- Estado: Pendiente
- Objetivo: adaptar la UX segun el modo monetario configurado.

Orden recomendado:

1. Productos, precios y configuracion comercial
2. POS y venta marginal
3. Ventas, detalle e historial
4. Cuentas por cobrar
5. Cuentas por pagar
6. Dashboard, estadisticas y reportes
7. WhatsApp, recibos y textos comerciales

Checklist transversal por modulo:

- [ ] No hardcodear `VES` ni `USD` en labels.
- [ ] Ocultar tasa y equivalencias cuando `exchange.mode = disabled`.
- [ ] Mostrar moneda local correcta en totales, inputs y validaciones.
- [ ] Mantener comportamiento actual de Venezuela sin regresiones.

Cierre de fase:

- La UI cambia correctamente segun pais y uso o no de USD.

### Fase 5. Tasa de cambio y fuentes

- Estado: Pendiente
- Objetivo: dejar la tasa como capacidad configurable, no como supuesto global.

Entregables:

- Modo `official_ve` para Venezuela.
- Modo `manual` para tiendas fuera de Venezuela que activen USD.
- Modo `disabled` para tiendas solo en moneda local.

Modulos impactados:

- `src/services/exchange/rateService.js`
- `src/contexts/ExchangeRateContext.js`
- constantes de fuentes de tasa
- prompts de actualizacion diaria

Checklist:

- [ ] Mantener BCV y flujo actual solo para Venezuela.
- [ ] Evitar consultas automaticas de tasa fuera de Venezuela.
- [ ] Permitir tasa manual en otros paises si usan USD.
- [ ] Ocultar o desactivar prompts diarios cuando no aplique.

Cierre de fase:

- Solo las tiendas que realmente usan tasa ven y ejecutan ese flujo.

### Fase 6. Mensajes, impuestos y legalidad

- Estado: Pendiente
- Objetivo: eliminar sesgos venezolanos en textos y reglas accesorias.

Entregables:

- Mensajes WhatsApp con moneda correcta.
- Etiquetas fiscales neutrales o parametrizadas por pais.
- Reglas tributarias opcionales por tienda o por pais.

Checklist:

- [ ] Revisar referencias a RIF y terminos exclusivamente venezolanos.
- [ ] Revisar IGTF para que no se trate como regla global.
- [ ] Ajustar plantillas comerciales y comprobantes.

Cierre de fase:

- Los textos y reglas secundarias no contradicen el pais configurado.

### Fase 7. QA, rollout y migracion controlada

- Estado: Pendiente
- Objetivo: desplegar sin romper tiendas existentes en Venezuela.

Estrategia:

- Primero tiendas nuevas.
- Luego migracion de tiendas existentes.
- Compatibilidad legacy temporal.

Casos minimos de prueba:

- [ ] Venezuela con USD + VES y tasa oficial.
- [ ] Colombia sin USD, solo COP.
- [ ] Colombia con USD + COP y tasa manual.
- [ ] Tienda historica migrada desde modelo USD/VES.
- [ ] WhatsApp, cuentas, ventas y dashboard en cada modo.

Cierre de fase:

- Rollout estable y sin regresiones criticas en Venezuela.

## Riesgos principales

- Riesgo alto: tocar esquema sin capa de compatibilidad rompe historicos.
- Riesgo alto: mantener labels hardcodeados en pantallas aunque el modelo ya soporte multi-pais.
- Riesgo medio: mezclar logica de pais con logica de modo operativo en muchos componentes.
- Riesgo medio: recalculos de cuentas y reportes usando defaults USD/VES heredados.

## Criterio de implementacion

Orden obligatorio:

1. Settings y contrato de tienda
2. Capa monetaria centralizada
3. Migracion de datos
4. Refactor de modulos UI
5. Fuentes de tasa
6. QA y rollout

No conviene empezar por pantallas aisladas antes de cerrar settings, utilidades y datos.

## Avance resumido

- [x] Problema definido
- [x] Regla especial para Venezuela definida
- [x] Decision de ocultar tasa cuando no se use USD definida
- [x] Roadmap corregido para seguimiento
- [x] Fase 0 ejecutada
- [x] Fase 1 ejecutada
- [ ] Fase 2 ejecutada
- [ ] Fase 3 ejecutada
- [ ] Fase 4 ejecutada
- [ ] Fase 5 ejecutada
- [ ] Fase 6 ejecutada
- [ ] Fase 7 ejecutada

## Notas de seguimiento

- Actualizar este documento al cerrar cada fase.
- Registrar decisiones nuevas antes de tocar persistencia o migraciones.
- Toda tarea que afecte moneda debe indicar a que modo operativo aplica.
