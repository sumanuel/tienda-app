import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

/**
 * Componente para mostrar historial de tasas en gráfico
 */
export const RateHistoryChart = ({ history, style }) => {
  if (!history || history.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.noData}>No hay datos para mostrar</Text>
      </View>
    );
  }

  const chartData = {
    labels: history.slice(-7).map((item, index) => {
      const date = new Date(item.createdAt);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }),
    datasets: [
      {
        data: history.slice(-7).map((item) => item.rate),
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Historial de Tasas (7 días)</Text>

      <LineChart
        data={chartData}
        width={Dimensions.get("window").width - 40}
        height={220}
        chartConfig={{
          backgroundColor: "#fff",
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#2196F3",
          },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noData: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingVertical: 40,
  },
});

export default RateHistoryChart;
