# Tienda POS - Estructura del Proyecto

Esta aplicación ha sido creada con una estructura completa y modular para un sistema de punto de venta (POS) con gestión de inventario, ventas, clientes y tasas de cambio.

## 📁 Estructura de Directorios

```
tienda-app/
├── src/
│   ├── constants/          # Constantes y configuraciones
│   │   ├── currencies.js
│   │   ├── exchangeSources.js
│   │   ├── productCategories.js
│   │   ├── taxRates.js
│   │   └── businessSettings.js
│   │
│   ├── utils/              # Funciones utilitarias
│   │   ├── currency.js
│   │   ├── exchange.js
│   │   ├── pricing.js
│   │   ├── receipts.js
│   │   ├── barcodeUtils.js
│   │   └── inventoryAlerts.js
│   │
│   ├── services/           # Servicios y lógica de negocio
│   │   ├── database/       # Gestión de base de datos SQLite
│   │   │   ├── products.js
│   │   │   ├── sales.js
│   │   │   ├── customers.js
│   │   │   ├── exchangeRates.js
│   │   │   └── settings.js
│   │   │
│   │   ├── exchange/       # Servicios de tasas de cambio
│   │   │   ├── rateService.js
│   │   │   ├── rateApi.js
│   │   │   └── rateCalculator.js
│   │   │
│   │   ├── pricing/        # Servicios de precios
│   │   │   ├── priceCalculator.js
│   │   │   ├── marginService.js
│   │   │   └── priceUpdater.js
│   │   │
│   │   ├── calculations/   # Cálculos (impuestos, descuentos, ganancias)
│   │   │   ├── taxes.js
│   │   │   ├── discounts.js
│   │   │   └── profits.js
│   │   │
│   │   ├── printers/       # Impresión de recibos
│   │   │   ├── thermalPrinter.js
│   │   │   └── pdfGenerator.js
│   │   │
│   │   └── barcode/        # Escaneo y generación de códigos
│   │       ├── scanner.js
│   │       └── generator.js
│   │
│   ├── hooks/              # Custom React Hooks
│   │   ├── useExchangeRate.js
│   │   ├── usePriceCalculation.js
│   │   ├── useProducts.js
│   │   ├── useSales.js
│   │   └── useInventory.js
│   │
│   ├── components/         # Componentes reutilizables
│   │   ├── exchange/       # Componentes de tasas de cambio
│   │   │   ├── RateDisplay.js
│   │   │   ├── RateHistoryChart.js
│   │   │   ├── AutoUpdateToggle.js
│   │   │   └── CurrencyConverter.js
│   │   │
│   │   └── pricing/        # Componentes de precios
│   │       ├── PriceCalculator.js
│   │       └── MultiCurrencyPrice.js
│   │
│   └── screens/            # Pantallas de la aplicación
│       └── main/
│           ├── DashboardScreen.js
│           ├── POSScreen.js
│           ├── ProductsScreen.js
│           ├── SalesScreen.js
│           ├── CustomersScreen.js
│           ├── InventoryScreen.js
│           ├── ExchangeRateScreen.js
│           └── SettingsScreen.js
│
├── App.js                  # Punto de entrada principal
├── package.json
├── app.json
└── babel.config.js
```

## 🚀 Características Principales

### 1. Gestión de Tasas de Cambio

- **Actualización automática** desde múltiples fuentes (BCV, DolarToday, Binance)
- **Conversión de monedas** USD ⇄ VES
- **Historial de tasas** con gráficos
- **Actualización manual** o automática programada

### 2. Gestión de Productos

- **CRUD completo** de productos
- **Precios en doble moneda** (USD y VES)
- **Cálculo automático** de precios según margen
- **Gestión de inventario** con alertas de stock bajo
- **Categorización** de productos
- **Códigos de barras**

### 3. Punto de Venta (POS)

- **Carrito de compras** interactivo
- **Múltiples métodos de pago**
- **Cálculo de impuestos** (IVA, IGTF)
- **Descuentos** y promociones
- **Impresión de recibos** (térmica o PDF)

### 4. Gestión de Ventas

- **Registro de ventas** con detalles completos
- **Reportes y estadísticas**
- **Historial de transacciones**
- **Cálculo de ganancias** por producto y total

### 5. Base de Datos

- **SQLite local** para almacenamiento
- **Tablas relacionales** bien estructuradas
- **Consultas optimizadas** con índices
- **Migración automática** de esquemas

## 🛠️ Tecnologías Utilizadas

- **React Native** - Framework principal
- **Expo** - Herramientas de desarrollo
- **React Navigation** - Navegación entre pantallas
- **Expo SQLite** - Base de datos local
- **Axios** - Peticiones HTTP para tasas de cambio
- **React Native Chart Kit** - Gráficos y visualizaciones
- **Expo Print** - Impresión de recibos
- **Expo Barcode Scanner** - Escaneo de códigos

## 📦 Instalación

```bash
cd "D:\Mis proyectos\tienda-app"
npm install
```

## 🎯 Ejecutar la Aplicación

```bash
# Iniciar Expo
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 📝 Próximos Pasos

Para comenzar a desarrollar:

1. **Instalar dependencias**: `npm install`
2. **Iniciar el proyecto**: `npm start`
3. **Personalizar configuración** en `src/constants/businessSettings.js`
4. **Agregar productos** de prueba
5. **Configurar tasas de cambio**

## 🔧 Configuración Inicial

1. **Información del Negocio**: Editar `src/constants/businessSettings.js`
2. **Tasas de Cambio**: La app se conecta automáticamente a APIs de Venezuela
3. **Productos**: Agregar desde la pantalla de Productos
4. **Impresora**: Configurar en Ajustes (opcional)

## 📱 Pantallas Principales

- **Dashboard**: Vista general con estadísticas
- **POS**: Punto de venta para procesar transacciones
- **Productos**: Gestión del catálogo de productos
- **Ventas**: Historial y reportes de ventas
- **Tasa de Cambio**: Gestión de conversión USD/VES
- **Ajustes**: Configuración general

## 💡 Características Destacadas

✅ Soporte para **doble moneda** (USD y VES)
✅ **Actualización automática** de tasas de cambio
✅ Cálculo inteligente de **márgenes y precios**
✅ **Alertas de inventario** bajo
✅ **Impresión de recibos** térmica o PDF
✅ **Base de datos local** SQLite
✅ **Interfaz intuitiva** y moderna
✅ **Reportes y estadísticas** en tiempo real

## 🎨 Personalización

Los colores, temas y configuraciones pueden personalizarse en:

- Estilos: Cada componente tiene su StyleSheet
- Constantes: `src/constants/`
- Configuración de negocio: `businessSettings.js`

---

**Desarrollado para Venezuela** 🇻🇪
Sistema adaptado para gestión de precios en USD y VES con actualización automática de tasas.
