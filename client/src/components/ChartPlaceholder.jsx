import { PieChart, BarChartHorizontal } from "lucide-react";
export default function ChartPlaceholder({ type, text, height = "h-64" }) {
    return (<div className={`${height} flex items-center justify-center bg-muted/20 rounded`}>
      <div className="text-center">
        {type === "pie" && <PieChart className="h-10 w-10 text-muted mx-auto mb-2"/>}
        {type === "bar" && <BarChartHorizontal className="h-10 w-10 text-muted mx-auto mb-2"/>}
        <p className="text-muted">{text}</p>
      </div>
    </div>);
}
