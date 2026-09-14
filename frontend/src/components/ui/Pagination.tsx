// src/components/ui/Pagination.tsx
import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface PaginationProps extends HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  showPreviousNext?: boolean;
  disabled?: boolean;
}

const Pagination = forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      className,
      currentPage,
      totalPages,
      onPageChange,
      siblingCount = 1,
      showFirstLast = true,
      showPreviousNext = true,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const range = (start: number, end: number) => {
      const length = end - start + 1;
      return Array.from({ length }, (_, i) => start + i);
    };

    const getPageNumbers = () => {
      const totalPageNumbers = siblingCount * 2 + 3; // siblings + current + first + last
      const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
      const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
      const showLeftDots = leftSiblingIndex > 2;
      const showRightDots = rightSiblingIndex < totalPages - 1;

      if (totalPageNumbers >= totalPages) {
        return range(1, totalPages);
      }

      if (!showLeftDots && showRightDots) {
        const leftRange = range(1, 3 + siblingCount * 2);
        return [...leftRange, -1, totalPages];
      }

      if (showLeftDots && !showRightDots) {
        const rightRange = range(totalPages - 2 - siblingCount * 2, totalPages);
        return [1, -1, ...rightRange];
      }

      const middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [1, -1, ...middleRange, -1, totalPages];
    };

    const pageNumbers = getPageNumbers();

    const handlePageChange = (page: number) => {
      if (!disabled && page !== currentPage && page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
    };

    if (totalPages <= 1) return null;

    return (
      <nav
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-1",
          className
        )}
        aria-label="Pagination"
        {...props}
      >
        {showFirstLast && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(1)}
            disabled={disabled || currentPage === 1}
            className="h-8 w-8"
          >
            <span className="sr-only">Première page</span>
            <ChevronLeft className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4 -ml-2" />
          </Button>
        )}

        {showPreviousNext && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={disabled || currentPage === 1}
            className="h-8 w-8"
          >
            <span className="sr-only">Page précédente</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        <div className="flex items-center gap-0.5">
          {pageNumbers.map((pageNumber, index) => {
            if (pageNumber === -1) {
              return (
                <span
                  key={`dots-${index}`}
                  className="flex items-center justify-center h-8 w-8 text-sm text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              );
            }

            return (
              <Button
                key={pageNumber}
                variant={currentPage === pageNumber ? "primary" : "ghost"}
                size="icon"
                onClick={() => handlePageChange(pageNumber)}
                disabled={disabled}
                className={cn(
                  "h-8 w-8 text-sm",
                  currentPage === pageNumber && "shadow-sm"
                )}
                aria-current={currentPage === pageNumber ? "page" : undefined}
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>

        {showPreviousNext && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={disabled || currentPage === totalPages}
            className="h-8 w-8"
          >
            <span className="sr-only">Page suivante</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {showFirstLast && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(totalPages)}
            disabled={disabled || currentPage === totalPages}
            className="h-8 w-8"
          >
            <span className="sr-only">Dernière page</span>
            <ChevronRight className="h-4 w-4" />
            <ChevronRight className="h-4 w-4 -ml-2" />
          </Button>
        )}
      </nav>
    );
  }
);

Pagination.displayName = "Pagination";

export interface PaginationInfoProps extends HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

const PaginationInfo = forwardRef<HTMLDivElement, PaginationInfoProps>(
  ({ className, currentPage, pageSize, totalItems, ...props }, ref) => {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);

    if (totalItems === 0) {
      return (
        <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props}>
          Aucun résultat
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props}>
        Affichage de <span className="font-medium">{start}</span> à{" "}
        <span className="font-medium">{end}</span> sur{" "}
        <span className="font-medium">{totalItems}</span> résultats
      </div>
    );
  }
);

PaginationInfo.displayName = "PaginationInfo";

export { Pagination, PaginationInfo };