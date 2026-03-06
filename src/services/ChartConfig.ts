export const getSparklineOptions = (isPositive: boolean) => ({
  chart: {
    type: "line",
    sparkline: {
      enabled: true,
    },
    animations: {
      enabled: true,
      easing: "easeinout",
      speed: 400,
    },
  },
  stroke: {
    width: 2,
    curve: "smooth",
  },
  grid: {
    show: false,
  },
  tooltip: {
    theme: "dark",
    x: {
      show: false,
    },
    y: {
      formatter: (value: number) => value.toLocaleString(),
    },
  },
  colors: [isPositive ? "#f43f5e" : "#3b82f6"],
});
