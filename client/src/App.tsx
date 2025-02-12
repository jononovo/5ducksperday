import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import Planning from "@/pages/planning";
import Lists from "@/pages/lists";
import Campaigns from "@/pages/campaigns";
import Outreach from "@/pages/outreach";
import DatabasePage from "@/pages/database";
import CompanyDetails from "@/pages/company-details";
import NotFound from "@/pages/not-found";
import MainNav from "@/components/main-nav";

function Router() {
  return (
    <>
      <MainNav />
      <Switch>
        <Route path="/planning" component={Planning} />
        <Route path="/" component={Home} />
        <Route path="/lists" component={Lists} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/outreach" component={Outreach} />
        <Route path="/database" component={DatabasePage} />
        <Route path="/companies/:id" component={CompanyDetails} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;