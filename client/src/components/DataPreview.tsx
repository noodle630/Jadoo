import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface DataIssue {
  type: string;
  count: number;
  description: string;
}

interface DataPreviewProps {
  data: Array<Record<string, any>>;
  columns: string[];
  issues?: DataIssue[];
}

export default function DataPreview({ data, columns, issues = [] }: DataPreviewProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">No data available for preview</p>
      </div>
    );
  }

  return (
    <div>
      {issues.length > 0 && (
        <Alert variant="warning" className="mb-4 bg-yellow-50 border-yellow-200 text-yellow-800">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-800 font-medium">
            Potential Data Issues Detected
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
              {issues.map((issue, idx) => (
                <li key={idx}>{issue.count} products {issue.description}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-yellow-700">
              AI processing can fix these issues automatically.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="uppercase text-xs font-medium">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 5).map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={`${rowIndex}-${column}`} className="text-sm">
                      {row[column] !== undefined ? String(row[column]) : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
