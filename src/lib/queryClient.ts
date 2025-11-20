import { QueryCache, QueryClient, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "../i18n";
import { getAdminErrorMessage } from "./errors";

const translate = i18n.t.bind(i18n);

function notify(error: unknown) {
  const message = getAdminErrorMessage(error, translate, translate("errors.DEFAULT"));
  toast.error(message);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query?.meta?.silent) return;
      notify(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation?.meta?.silent) return;
      notify(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
