import { AlertCircle } from "lucide-react";
import { Button } from "./button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

interface ErrorProps {
  title?: string;
  message?: string;
  retry?: () => void;
}

export function ErrorDisplay({ title = "Something went wrong", message, retry }: ErrorProps) {
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle>{title}</CardTitle>
        </div>
        {message && <CardDescription>{message}</CardDescription>}
      </CardHeader>
      {retry && (
        <CardFooter>
          <Button onClick={retry} variant="outline" className="w-full">
            Try Again
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export function ErrorPage({ title, message, retry }: ErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ErrorDisplay title={title} message={message} retry={retry} />
    </div>
  );
}
