// Impor modular ECharts: hanya grafik batang, grid, tooltip, aria, dan renderer SVG.
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { AriaComponent, GridComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

echarts.use([BarChart, GridComponent, TooltipComponent, AriaComponent, SVGRenderer]);

export { echarts };
