var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
const Progress = React.forwardRef((_a, ref) => {
    var { className, value, indicatorClassName } = _a, props = __rest(_a, ["className", "value", "indicatorClassName"]);
    return (<ProgressPrimitive.Root ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-gray-800", className)} {...props}>
    <ProgressPrimitive.Indicator className={cn("h-full w-full flex-1 bg-blue-600 transition-all", indicatorClassName)} style={{ transform: `translateX(-${100 - (value || 0)}%)` }}/>
  </ProgressPrimitive.Root>);
});
Progress.displayName = ProgressPrimitive.Root.displayName;
export { Progress };
