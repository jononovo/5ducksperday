import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import Auth from "@/pages/auth";
import Home from "@/pages/home";
import Planning from "@/pages/planning";
import Lists from "@/pages/lists";
import ListDetails from "@/pages/list-details";
import Campaigns from "@/pages/campaigns";
import CampaignDetails from "@/pages/campaign-details";
import Outreach from "@/pages/outreach";
import DatabasePage from "@/pages/database";
import CompanyDetails from "@/pages/company-details";
import ApiTemplates from "@/pages/api-templates";
import NotFound from "@/pages/not-found";
import MainNav from "@/components/main-nav";
import ContactDetails from "@/pages/contact-details";

function Router() {
  return (
    <>
      <MainNav />
      <Switch>
        <Route path="/auth" component={Auth} />
        <ProtectedRoute path="/planning" component={Planning} />
        <ProtectedRoute path="/" component={Home} />
        <ProtectedRoute path="/lists" component={Lists} />
        <ProtectedRoute path="/lists/:listId" component={ListDetails} />
        <ProtectedRoute path="/campaigns" component={Campaigns} />
        <ProtectedRoute path="/campaigns/:id" component={CampaignDetails} />
        <ProtectedRoute path="/outreach" component={Outreach} />
        <ProtectedRoute path="/database" component={DatabasePage} />
        <ProtectedRoute path="/companies/:id" component={CompanyDetails} />
        <ProtectedRoute path="/contacts/:id" component={ContactDetails} />
        <ProtectedRoute path="/api-templates" component={ApiTemplates} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;