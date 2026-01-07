import { Dimensions, PixelRatio, Platform } from "react-native";

// Base dimensions (iPhone 12/13 mini - common baseline)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Scale limits to prevent UI from becoming too small or too large
const MIN_SCALE = 0.85; // Allow slight shrinking for very small devices
const MAX_SCALE = 1.6; // Cap scaling for very large screens

// Clamp function to keep values within bounds
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Get the current screen scale factor based on width
 */
const getWidthScale = () => {
  const { width } = Dimensions.get("window");
  return clamp(width / BASE_WIDTH, MIN_SCALE, MAX_SCALE);
};

/**
 * Get the current screen scale factor based on height
 */
const getHeightScale = () => {
  const { height } = Dimensions.get("window");
  return clamp(height / BASE_HEIGHT, MIN_SCALE, MAX_SCALE);
};

/**
 * Get the minimum scale (useful for balanced scaling)
 */
const getScale = () => {
  const widthScale = getWidthScale();
  const heightScale = getHeightScale();
  return Math.min(widthScale, heightScale);
};

/**
 * Scale any size value proportionally
 * @param {number} size - Base size value
 * @returns {number} Scaled size
 */
export const s = (size) => {
  return size * getScale();
};

/**
 * Moderate scaling - less aggressive than full scaling
 * @param {number} size - Base size value
 * @param {number} factor - Scaling intensity (0-1)
 * @returns {number} Moderately scaled size
 */
export const ms = (size, factor = 0.7) => {
  const scaled = s(size);
  return size + (scaled - size) * factor;
};

/**
 * Responsive font size with pixel-perfect rounding
 * @param {number} fontSize - Base font size
 * @param {number} factor - Scaling intensity (0-1, default 0.8 for typography)
 * @returns {number} Scaled and rounded font size
 */
export const rf = (fontSize, factor = 0.8) => {
  const scaled = ms(fontSize, factor);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Scale vertical spacing/margins
 * @param {number} size - Base size
 * @returns {number} Scaled size
 */
export const vs = (size) => {
  return size * getHeightScale();
};

/**
 * Scale horizontal spacing/margins
 * @param {number} size - Base size
 * @returns {number} Scaled size
 */
export const hs = (size) => {
  return size * getWidthScale();
};

/**
 * Get current screen dimensions
 */
export const screenWidth = Dimensions.get("window").width;
export const screenHeight = Dimensions.get("window").height;

/**
 * Device type detection
 */
export const isTablet = () => {
  const { width, height } = Dimensions.get("window");
  const minDimension = Math.min(width, height);
  return minDimension >= 600;
};

export const isSmallDevice = () => {
  const { width, height } = Dimensions.get("window");
  const minDimension = Math.min(width, height);
  return minDimension < 375;
};

export const isLargeDevice = () => {
  const { width, height } = Dimensions.get("window");
  const minDimension = Math.min(width, height);
  return minDimension > 800;
};

/**
 * Platform-specific scaling adjustments
 */
export const platformScale = (size) => {
  const scale = getScale();
  // Android often needs slightly different scaling
  const platformMultiplier = Platform.OS === "android" ? 1.02 : 1.0;
  return size * scale * platformMultiplier;
};

/**
 * Get responsive spacing values
 */
export const spacing = {
  xs: s(4),
  sm: s(6),
  md: s(12),
  lg: s(18),
  xl: s(24),
  xxl: s(36),
};

/**
 * Get responsive border radius values
 */
export const borderRadius = {
  sm: s(6),
  md: s(12),
  lg: s(18),
  xl: s(24),
};

/**
 * Get responsive icon sizes
 */
export const iconSize = {
  sm: s(20),
  md: s(28),
  lg: s(44),
  xl: s(56),
  xxl: s(60),
};

/**
 * Debug function to log current scaling info
 */
export const logScalingInfo = () => {
  console.log("=== Responsive Scaling Info ===");
  console.log(`Screen: ${screenWidth}x${screenHeight}`);
  console.log(`Width Scale: ${getWidthScale().toFixed(2)}x`);
  console.log(`Height Scale: ${getHeightScale().toFixed(2)}x`);
  console.log(`Combined Scale: ${getScale().toFixed(2)}x`);
  console.log(`Is Tablet: ${isTablet()}`);
  console.log(`Is Small Device: ${isSmallDevice()}`);
  console.log(`Is Large Device: ${isLargeDevice()}`);
  console.log("===============================");
};
