"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { usePushupHistory } from "@/lib/query/pushup-queries";

const DATE_RANGE_OPTIONS = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "All Time", days: 365 },
] as const;

const ITEMS_PER_PAGE = 10;

export function History() {
  const { profile } = useAuth();
  const [selectedRange, setSelectedRange] = useState(30); // Default to 30 days
  const [currentPage, setCurrentPage] = useState(1);

  const { data: historyData = [], isLoading } = usePushupHistory(profile?.id, selectedRange);

  // Pagination logic
  const totalPages = Math.ceil(historyData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = historyData.slice(startIndex, endIndex);

  const handleRangeChange = (days: number) => {
    setSelectedRange(days);
    setCurrentPage(1); // Reset to first page when changing range
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          History
        </CardTitle>
        <CardDescription>View your pushup entries over time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {DATE_RANGE_OPTIONS.map((option) => (
            <Button
              key={option.days}
              variant={selectedRange === option.days ? "default" : "outline"}
              size="sm"
              onClick={() => handleRangeChange(option.days)}
              className="whitespace-nowrap"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No entries yet</p>
            <p className="text-sm">Start tracking your pushups to see your history!</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedData.map((entry) => (
                <div
                  key={entry.entry_date}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {/* Date Info */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-primary/10">
                      <span className="text-xs text-muted-foreground font-medium">
                        {getDayOfWeek(entry.entry_date)}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {new Date(entry.entry_date).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{formatDate(entry.entry_date)}</p>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Count */}
                  <div className="text-right">
                    <p className="text-2xl font-bold">{entry.count}</p>
                    <p className="text-xs text-muted-foreground">pushups</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Summary */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Showing {historyData.length} {historyData.length === 1 ? "entry" : "entries"}
                </span>
                <span className="font-medium">
                  Total: {historyData.reduce((sum, entry) => sum + entry.count, 0)} pushups
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
