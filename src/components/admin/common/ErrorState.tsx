import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
      <p className="font-medium">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          className="mt-4 border-red-200 text-red-700 hover:bg-red-100"
          onClick={onRetry}
        >
          {t("app.actions.retry", "Retry")}
        </Button>
      )}
    </div>
  );
}
