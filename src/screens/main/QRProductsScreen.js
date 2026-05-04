import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Pressable,
  TextInput,
} from "react-native";
import { useProducts } from "../../hooks/useProducts";
import QRCode from "react-native-qrcode-svg";
import { printAsync } from "expo-print";
import qrcode from "qrcode";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  InfoPill,
  SHADOWS,
  SurfaceCard,
  UI_COLORS,
} from "../../components/common/AppUI";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

/**
 * Pantalla para ver códigos QR de productos
 */
export const QRProductsScreen = ({ navigation }) => {
  const { products, loading } = useProducts();
  const { showAlert, CustomAlert } = useCustomAlert();
  const [startRange, setStartRange] = useState("");
  const [endRange, setEndRange] = useState("");

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) => {
        const numA = parseInt((a.barcode || "").replace("PROD-", ""), 10) || 0;
        const numB = parseInt((b.barcode || "").replace("PROD-", ""), 10) || 0;
        return numA - numB;
      }),
    [products],
  );

  const startNum = parseInt(startRange) || 0;
  const endNum = parseInt(endRange) || Infinity;

  const filteredProducts = useMemo(
    () =>
      sortedProducts.filter((product) => {
        const num =
          parseInt((product.barcode || "").replace("PROD-", ""), 10) || 0;
        return num >= startNum && num <= endNum;
      }),
    [sortedProducts, startNum, endNum],
  );

  const printSelected = async () => {
    if (filteredProducts.length === 0) {
      showAlert({
        title: "Sin productos",
        message: "No hay productos visibles para imprimir códigos QR.",
        type: "warning",
      });
      return;
    }

    // Confirmación creativa
    showAlert({
      title: "Generar códigos QR",
      message: `¿Estás seguro de generar ${filteredProducts.length} códigos QR para los productos que ves en pantalla?`,
      type: "warning",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "¡Generar!",
          onPress: async () => {
            const productsToPrint = filteredProducts;

            // Generate QR SVGs
            const productsWithQR = await Promise.all(
              productsToPrint.map(async (product) => {
                try {
                  const qrSVG = await qrcode.toString(product.barcode, {
                    type: "svg",
                    width: 200,
                  });
                  return { ...product, qrSVG };
                } catch (error) {
                  console.error(
                    "Error generating QR for",
                    product.barcode,
                    error,
                  );
                  return {
                    ...product,
                    qrSVG: `<svg width="200" height="200"><text x="50%" y="50%" text-anchor="middle">Error</text></svg>`,
                  };
                }
              }),
            );

            const html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .product { text-align: center; padding: 5px; }
        .qr { width: 100px; height: 100px; margin: 0 auto; }
        .qr svg { width: 100%; height: 100%; }
        .name { font-size: 10px; margin-top: 5px; }
      </style>
    </head>
    <body>
      <div class="grid">
        ${productsWithQR
          .map(
            (product) => `
          <div class="product">
            <div class="qr">${product.qrSVG}</div>
            <div class="name">${product.name}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    </body>
    </html>
    `;

            try {
              await printAsync({ html });
              showAlert({
                title: "¡Generación exitosa!",
                message:
                  "Los códigos QR han sido enviados a impresión. Que tengas un día productivo.",
                type: "success",
              });
            } catch (error) {
              console.error("Error printing QR codes:", error);
              showAlert({
                title: "Error",
                message: "No se pudo imprimir: " + error.message,
                type: "error",
              });
            }
          },
        },
      ],
    });
  };
  const renderProduct = useCallback(({ item }) => {
    return (
      <SurfaceCard style={styles.productCard}>
        <View style={styles.productInfo}>
          <InfoPill
            text={item.category || "General"}
            tone="info"
            style={styles.productCategoryPill}
          />
          <Text style={styles.productName}>{item.name.toUpperCase()}</Text>
          <Text style={styles.productBarcode}>Código: {item.barcode}</Text>
        </View>
        <View style={styles.qrContainer}>
          <QRCode value={item.barcode} size={iconSize.lg} />
        </View>
      </SurfaceCard>
    );
  }, []);

  const productKeyExtractor = useCallback((item) => item.id.toString(), []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={filteredProducts}
          keyExtractor={productKeyExtractor}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <SurfaceCard style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>QR</Text>
                  </View>
                  <InfoPill
                    text={`${filteredProducts.length} visibles`}
                    tone="accent"
                  />
                </View>

                <View style={styles.heroCopy}>
                  <Text style={styles.heroEyebrow}>Etiquetas</Text>
                  <Text style={styles.heroTitle}>Imprimir códigos QR</Text>
                  <Text style={styles.heroSubtitle}>
                    Filtra por rango y genera en lote los códigos de los
                    productos visibles.
                  </Text>
                </View>
              </SurfaceCard>

              <SurfaceCard style={styles.searchSurface}>
                <View style={styles.searchTitleBlock}>
                  <Text style={styles.searchTitle}>Rango de productos</Text>
                  <Text style={styles.searchHint}>
                    Define desde qué código hasta cuál quieres generar.
                  </Text>
                </View>

                <View style={styles.rangeContainer}>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="Desde"
                    value={startRange}
                    onChangeText={setStartRange}
                    keyboardType="numeric"
                    placeholderTextColor="#9aa2b1"
                  />
                  <Text style={styles.rangeSeparator}>a</Text>
                  <TextInput
                    style={styles.rangeInput}
                    placeholder="Hasta"
                    value={endRange}
                    onChangeText={setEndRange}
                    keyboardType="numeric"
                    placeholderTextColor="#9aa2b1"
                  />
                </View>
              </SurfaceCard>

              <Pressable
                style={({ pressed }) => [
                  styles.printButton,
                  pressed && styles.cardPressed,
                ]}
                onPress={printSelected}
              >
                <Text style={styles.printButtonText}>
                  Generar QR ({filteredProducts.length})
                </Text>
              </Pressable>
            </View>
          }
        />
      </SafeAreaView>
      <CustomAlert />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  headerContent: {
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  heroCard: {
    gap: spacing.lg,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroBadge: {
    width: s(48),
    height: s(48),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeText: {
    fontSize: rf(13),
    fontWeight: "800",
    color: UI_COLORS.accent,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: vs(120),
  },
  heroCopy: {
    gap: spacing.xs,
  },
  heroEyebrow: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    lineHeight: vs(20),
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...SHADOWS.soft,
  },
  productInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  productCategoryPill: {
    alignSelf: "flex-start",
  },
  productName: {
    fontSize: rf(15),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  productBarcode: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
  },
  qrContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: hs(8),
  },
  searchSurface: {
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  searchTitleBlock: {
    gap: spacing.xs,
  },
  searchTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  searchHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  rangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(8),
  },
  rangeInput: {
    flex: 1,
    height: vs(46),
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(12),
    fontSize: rf(15),
    backgroundColor: UI_COLORS.surfaceAlt,
    color: UI_COLORS.text,
  },
  rangeSeparator: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  printButton: {
    backgroundColor: UI_COLORS.accent,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    alignItems: "center",
  },
  printButtonText: {
    color: "#fff",
    fontSize: rf(13),
    fontWeight: "700",
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default QRProductsScreen;
