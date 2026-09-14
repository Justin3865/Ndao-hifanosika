// src/components/ui/Table.tsx
import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  hover?: boolean;
  compact?: boolean;
}

const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, striped = false, hover = false, compact = false, children, ...props }, ref) => {
    return (
      <div className="relative w-full overflow-auto">
        <table
          ref={ref}
          className={cn(
            "w-full caption-bottom text-sm",
            compact ? "[&_td]:py-2 [&_th]:py-2" : "[&_td]:py-3 [&_th]:py-3",
            hover && "[&_tr:hover]:bg-muted/30",
            striped && "[&_tr:nth-child(even)]:bg-muted/10",
            className
          )}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);
Table.displayName = "Table";

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}

const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn(
          "[&_tr]:border-b [&_tr]:border-border/50 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:uppercase [&_th]:tracking-wider [&_th]:bg-muted/20",
          className
        )}
        {...props}
      >
        {children}
      </thead>
    );
  }
);
TableHeader.displayName = "TableHeader";

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={cn("[&_tr:last-child]:border-0", className)}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);
TableBody.displayName = "TableBody";

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected = false, children, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          "border-b border-border/50 transition-colors",
          selected && "bg-primary/5",
          className
        )}
        {...props}
      >
        {children}
      </tr>
    );
  }
);
TableRow.displayName = "TableRow";

export interface TableHeadProps extends HTMLAttributes<HTMLTableCellElement> {
  width?: string | number;
  align?: "left" | "center" | "right";
}

const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, width, align = "left", children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          "px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
          align === "center" && "text-center",
          align === "right" && "text-right",
          className
        )}
        style={{ width }}
        {...props}
      >
        {children}
      </th>
    );
  }
);
TableHead.displayName = "TableHead";

export interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
  colSpan?: number;
}

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = "left", children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          "px-4 py-3 text-sm",
          align === "center" && "text-center",
          align === "right" && "text-right",
          className
        )}
        {...props}
      >
        {children}
      </td>
    );
  }
);
TableCell.displayName = "TableCell";

export interface TableEmptyProps extends HTMLAttributes<HTMLTableRowElement> {
  colSpan: number;
  message?: string;
  icon?: ReactNode;
}

const TableEmpty = forwardRef<HTMLTableRowElement, TableEmptyProps>(
  ({ className, colSpan, message = "Aucune donnée disponible", icon, children, ...props }, ref) => {
    return (
      <TableRow ref={ref} className={className} {...props}>
        <TableCell colSpan={colSpan} className="text-center py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            {icon && <div className="text-muted-foreground/50">{icon}</div>}
            <p className="text-muted-foreground">{children || message}</p>
          </div>
        </TableCell>
      </TableRow>
    );
  }
);
TableEmpty.displayName = "TableEmpty";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty };