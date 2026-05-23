import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import FillDay from "@/pages/FillDay";
import Entries from "@/pages/Entries";
import Employees from "@/pages/Employees";
import EmployeeStats from "@/pages/EmployeeStats";
import Objects from "@/pages/Objects";
import Reports from "@/pages/Reports";
import UnfilledDays from "@/pages/UnfilledDays";
import Schedule from "@/pages/Schedule";
import NotFound from "@/pages/not-found";

const CACHE_KEY = "tabele-qc";
const MAX_AGE_MS = 10 * 60_000;

function loadCache(client: QueryClient) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: unknown[] };
    if (Date.now() - ts > MAX_AGE_MS) return;
    client.getQueryCache().getAll().forEach(q => q.destroy());
    (data as Array<{ queryKey: unknown[]; data: unknown; dataUpdatedAt: number }>)
      .forEach(({ queryKey, data: qData, dataUpdatedAt }) => {
        client.setQueryData(queryKey as string[], qData, { updatedAt: dataUpdatedAt });
      });
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
  }
}

function saveCache(client: QueryClient) {
  try {
    const data = client.getQueryCache().getAll()
      .filter(q => q.state.status === "success")
      .map(q => ({ queryKey: q.queryKey, data: q.state.data, dataUpdatedAt: q.state.dataUpdatedAt }));
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: MAX_AGE_MS,
      refetchInterval: 10_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

loadCache(queryClient);

queryClient.getQueryCache().subscribe(() => {
  saveCache(queryClient);
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/fill" component={FillDay} />
      <Route path="/entries" component={Entries} />
      <Route path="/employees" component={Employees} />
      <Route path="/employees/:id" component={EmployeeStats} />
      <Route path="/objects" component={Objects} />
      <Route path="/reports" component={Reports} />
      <Route path="/unfilled" component={UnfilledDays} />
      <Route path="/schedule" component={Schedule} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
