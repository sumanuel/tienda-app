/**
 * Calcula la ganancia de un producto
 * @param {number} cost - Costo del producto
 * @param {number} salePrice - Precio de venta
 * @param {number} quantity - Cantidad vendida
 * @returns {object} Desglose de ganancia
 */
export const calculateProductProfit = (cost, salePrice, quantity = 1) => {
  const unitProfit = salePrice - cost;
  const totalProfit = unitProfit * quantity;
  const margin = cost > 0 ? (unitProfit / cost) * 100 : 0;

  return {
    cost,
    salePrice,
    quantity,
    unitProfit,
    totalProfit,
    margin,
  };
};

/**
 * Calcula la ganancia total de una venta
 * @param {array} items - Items de la venta
 * @returns {object} Desglose de ganancia
 */
export const calculateSaleProfit = (items) => {
  let totalCost = 0;
  let totalRevenue = 0;

  const itemDetails = items.map((item) => {
    const itemCost = item.cost * item.quantity;
    const itemRevenue = item.price * item.quantity;

    totalCost += itemCost;
    totalRevenue += itemRevenue;

    return calculateProductProfit(item.cost, item.price, item.quantity);
  });

  const totalProfit = totalRevenue - totalCost;
  const margin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return {
    totalCost,
    totalRevenue,
    totalProfit,
    margin,
    items: itemDetails,
  };
};

/**
 * Calcula ganancias por período
 * @param {array} sales - Ventas del período
 * @returns {object} Resumen de ganancias
 */
export const calculatePeriodProfits = (sales) => {
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  sales.forEach((sale) => {
    totalRevenue += sale.total;

    if (sale.items) {
      sale.items.forEach((item) => {
        totalCost += item.cost * item.quantity;
      });
    }
  });

  totalProfit = totalRevenue - totalCost;
  const margin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return {
    totalSales: sales.length,
    totalRevenue,
    totalCost,
    totalProfit,
    margin,
    averageSale: sales.length > 0 ? totalRevenue / sales.length : 0,
    averageProfit: sales.length > 0 ? totalProfit / sales.length : 0,
  };
};

export default {
  calculateProductProfit,
  calculateSaleProfit,
  calculatePeriodProfits,
};
