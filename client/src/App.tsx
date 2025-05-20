import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { SemiProtectedRoute } from "@/lib/semi-protected-route";
import { Layout, AppLayout } from "@/components/layout";
import { SearchStrategyProvider } from "@/lib/search-strategy-context";
import Auth from "@/pages/auth";
import Home from "@/pages/home";
import LandingPage from "@/pages/landing";
import Build from "@/pages/build";
import Lists from "@/pages/lists";
import ListDetails from "@/pages/list-details";
import Campaigns from "@/pages/campaigns";
import CampaignDetails from "@/pages/campaign-details";
import Outreach from "@/pages/outreach";
import Replies from "@/pages/replies";
import CompanyDetails from "@/pages/company-details";
import ContactDetails from "@/pages/contact-details";

import NotFound from "@/pages/not-found";
import { MainNav } from "@/components/main-nav";

import Terms from "@/pages/terms";
import Pricing from "@/pages/pricing";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import Contact from "@/pages/contact";
import Support from "@/pages/support";
import Levels from "@/pages/levels";

function Router() {
  return (
    <>
      <Switch>
        {/* Public Landing Page (no layout or nav) */}
        <Route path="/" component={LandingPage} />
        
        {/* All other routes with standard layout */}
        <Route path="*">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Switch>
                <Route path="/auth" component={Auth} />
                
                {/* Semi-protected routes - allow initial access but prompt for login for certain actions */}
                <SemiProtectedRoute path="/app" component={() => <Home />} />
                <SemiProtectedRoute path="/companies/:id" component={() => <CompanyDetails />} />
                
                {/* Fully protected routes - require login */}
                <ProtectedRoute path="/build" component={() => <Build />} />
                <ProtectedRoute path="/lists" component={() => <Lists />} />
                <ProtectedRoute path="/lists/:listId" component={() => <ListDetails />} />
                <ProtectedRoute path="/campaigns" component={() => <Campaigns />} />
                <ProtectedRoute path="/campaigns/:id" component={() => <CampaignDetails />} />
                <ProtectedRoute path="/outreach" component={() => <Outreach />} />
                <ProtectedRoute path="/replies" component={() => <Replies />} />
                <ProtectedRoute path="/contacts/:id" component={() => <ContactDetails />} />

                {/* Public Routes */}
                {/* Privacy Policy is now available as a blog post */}
                <Route path="/terms" component={() => <Terms />} />
                <Route path="/pricing" component={() => <Pricing />} />
                <Route path="/blog" component={() => <Blog />} />
                <Route path="/blog/:slug" component={() => <BlogPost />} />
                <Route path="/levels" component={() => <Levels />} />
                <Route path="/contact" component={() => <Contact />} />
                <Route path="/support" component={() => <Support />} />
                <Route component={() => <NotFound />} />
              </Switch>
            </div>
          </Layout>
        </Route>
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SearchStrategyProvider>
          <Router />
          <Toaster />
        </SearchStrategyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;