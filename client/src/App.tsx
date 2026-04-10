import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import AuthGuard from "@/components/AuthGuard";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      {/* Rota pública de login */}
      <Route path="/login" component={Login} />

      {/* Rotas protegidas — envolvidas pelo AuthGuard */}
      <Route path="/">
        {() => (
          <AuthGuard>
            <Home />
          </AuthGuard>
        )}
      </Route>
      <Route path="/regulacao">
        {() => (
          <AuthGuard>
            <Home />
          </AuthGuard>
        )}
      </Route>
      <Route path="/dashboard">
        {() => (
          <AuthGuard>
            <Home />
          </AuthGuard>
        )}
      </Route>
      <Route path="/prioridades">
        {() => (
          <AuthGuard>
            <Home />
          </AuthGuard>
        )}
      </Route>
      <Route path="/protocolos">
        {() => (
          <AuthGuard>
            <Home />
          </AuthGuard>
        )}
      </Route>
      <Route path="/documentos">
        {() => (
          <AuthGuard>
            <Home />
          </AuthGuard>
        )}
      </Route>
      <Route path="/minhas-agendas">
        {() => (
          <AuthGuard>
            <Home />
          </AuthGuard>
        )}
      </Route>
      <Route path="/monitor-checkins">
        {() => (
          <AuthGuard>
            <Home />
          </AuthGuard>
        )}
      </Route>
      <Route path="/reguladores">
        {() => (
          <AuthGuard>
            <Home />
          </AuthGuard>
        )}
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
