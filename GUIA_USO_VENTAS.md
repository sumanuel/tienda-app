# 🛒 Tienda App - Guía de Uso

## Pantalla de Punto de Venta (POS)

La pantalla de ventas está dividida en dos paneles principales:

### 📦 Panel Izquierdo - Productos Disponibles

- **Grilla de productos**: Muestra todos los productos disponibles en 2 columnas
- **Información de cada producto**:
  - Nombre del producto
  - Precio en bolívares (calculado automáticamente con tasa de cambio)
  - Cantidad en stock disponible
- **Cómo agregar productos**: Simplemente toca cualquier producto para agregarlo al carrito

### 🛒 Panel Derecho - Carrito de Compras

#### 👤 Información del Cliente

- Campo opcional para ingresar el nombre del cliente
- Si no se ingresa nombre, se registra como "Cliente"

#### 📋 Lista del Carrito

- Muestra todos los productos agregados
- Para cada producto:
  - Nombre y precio unitario
  - Controles de cantidad (+ y -)
  - Subtotal por producto
  - Botón para eliminar del carrito

#### 💳 Método de Pago

- **Efectivo**: Pago en efectivo
- **Tarjeta**: Pago con tarjeta de crédito/débito
- **Transferencia**: Pago por transferencia bancaria

#### 💰 Total y Acciones

- **Total a Pagar**: Suma total de todos los productos
- **Botón Limpiar**: Vacía todo el carrito (con confirmación)
- **Completar Venta**: Registra la venta en la base de datos

## 📊 Pantalla de Ventas (Historial)

### 📈 Estadísticas del Día

- Número total de ventas realizadas hoy
- Monto total vendido en el día

### 📋 Lista de Ventas

Cada venta muestra:

- **Número de venta** (ID único)
- **Fecha y hora** de la venta
- **Cliente** (nombre registrado)
- **Método de pago** (con color distintivo)
- **Cantidad de productos** vendidos
- **Total** de la venta

### 👆 Ver Detalles

Toca cualquier venta para ver información completa:

- **Resumen**: Cliente, fecha, método de pago, total
- **Productos vendidos**: Lista detallada con cantidades y precios
- **Botón Volver**: Regresa a la lista de ventas

## 🔄 Flujo de Trabajo Típico

1. **Abrir la app** → Se cargan productos automáticamente
2. **Ir a la pestaña "Venta"** (🛒)
3. **Agregar productos** tocándolos en el panel izquierdo
4. **Ajustar cantidades** usando los botones + y -
5. **Ingresar nombre del cliente** (opcional)
6. **Seleccionar método de pago**
7. **Completar la venta** presionando "Completar Venta"
8. **Ver historial** en la pestaña "Ventas" (📊)

## 💡 Consejos de Uso

- Los precios se calculan automáticamente en bolívares usando la tasa de cambio actual
- Puedes agregar el mismo producto múltiples veces (se incrementa la cantidad)
- Si un producto se queda sin stock, no se puede agregar al carrito
- Todas las ventas quedan registradas permanentemente en la base de datos
- Los totales se actualizan en tiempo real

## 🚨 Estados Especiales

- **Carrito vacío**: No se puede completar venta
- **Producto sin stock**: Aparece pero no se puede agregar
- **Cargando productos**: Muestra mensaje mientras se obtienen los datos
- **Sin ventas**: Muestra mensaje explicativo en el historial
