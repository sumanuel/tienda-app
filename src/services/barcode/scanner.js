import { BarCodeScanner } from "expo-barcode-scanner";

/**
 * Solicita permisos para usar la cámara
 * @returns {Promise<boolean>} True si se otorgó permiso
 */
export const requestCameraPermission = async () => {
  try {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting camera permission:", error);
    return false;
  }
};

/**
 * Verifica si hay permisos para usar la cámara
 * @returns {Promise<boolean>} True si hay permiso
 */
export const hasCameraPermission = async () => {
  try {
    const { status } = await BarCodeScanner.getPermissionsAsync();
    return status === "granted";
  } catch (error) {
    return false;
  }
};

/**
 * Procesa el código de barras escaneado
 * @param {string} data - Datos del código de barras
 * @param {string} type - Tipo de código de barras
 * @returns {object} Objeto con datos procesados
 */
export const processScannedBarcode = (data, type) => {
  return {
    data: data.trim(),
    type,
    scannedAt: new Date().toISOString(),
  };
};

export default {
  requestCameraPermission,
  hasCameraPermission,
  processScannedBarcode,
};
