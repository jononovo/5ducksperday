import { lazy, Suspense, useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { AppLayout, Layout } from "@/components/layout";
import { MainNav } from "@/components/main-nav";
import { ProtectedRoute } from "@/lib/protected-route";
import { SemiProtectedRoute } from "@/lib/semi-protected-route";
import { StrategyOverlayProvider } from "@/features/strategy-chat";
import { AuthProvider } from "@/hooks/use-auth";
import { RegistrationModalProvider } from "@/hooks/use-registration-modal";
import { RegistrationModalContainer } from "@/components/registration-modal-container";
import { Toaster } from "@/components/ui/toaster";
import "@/lib/firebase";
import { initGA } from "@/lib/analytics";
import { useAnalytics } from "@/hooks/use-analytics";

// Static pages
import Landing from "@/pages/landing";
import Landing2 from "@/pages/landing2";
import Planning from "@/pages/planning";
import Auth from "@/pages/auth";

// Lazy imports for app pages that can be loaded on demand
const Home = lazy(() => import("@/pages/home"));
const Account = lazy(() => import("@/pages/account"));
const Outreach = lazy(() => import("@/pages/outreach"));
const Replies = lazy(() => import("@/pages/replies"));
const CompanyDetails = lazy(() => import("@/pages/company-details"));
const ContactDetails = lazy(() => import("@/pages/contact-details"));
const Testing = lazy(() => import("@/pages/testing"));
const SubscriptionSuccess = lazy(() => import("@/pages/subscription-success"));
const NotFound = lazy(() => import("@/pages/not-found"));
const StrategyDashboard = lazy(() => import("@/features/strategy-chat").then(module => ({ default: module.StrategyDashboard })));
const DailyOutreach = lazy(() => import("@/pages/DailyOutreach"));
const Streak = lazy(() => import("@/pages/Streak"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const ContactListDetail = lazy(() => import("@/pages/ContactListDetail"));
const AllContacts = lazy(() => import("@/pages/AllContacts"));
const Campaigns = lazy(() => import("@/features/campaigns").then(module => ({ default: module.CampaignsPage })));

// Lazy imports for admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
const AdminEmailTesting = lazy(() => import("@/pages/admin/EmailTesting"));
const AdminApiTesting = lazy(() => import("@/pages/admin/ApiTesting"));

// Lazy imports for marketing pages
const Terms = lazy(() => import("@/pages/terms"));
const Blog = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const Support = lazy(() => import("@/pages/support"));
const Levels = lazy(() => import("@/pages/levels"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Changelog = lazy(() => import("@/pages/changelog"));

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <>
      <Switch>
        {/* Static landing page is served directly by Express at "/" */}
        
        {/* React version of landing page for comparison */}
        <Route path="/react-landing" component={Landing} />
        
        {/* Landing2 Page Clone */}
        <Route path="/landing2" component={Landing2} />
        
        {/* Strategic Planning Page (no nav) */}
        <Route path="/planning" component={Planning} />
        
        {/* Daily Outreach Page - Standalone without navigation */}
        <Route path="/outreach/daily/:token" component={() => 
          <Suspense fallback={<LoadingScreen />}>
            <DailyOutreach />
          </Suspense>
        } />
        
        {/* Marketing pages with full footer */}
        <Route path="/terms">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Terms />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/blog">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Blog />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/blog/:slug">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <BlogPost />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/levels">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Levels />
              </Suspense>
            </div>
          </Layout>
        </Route>

        <Route path="/support">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Support />
              </Suspense>
            </div>
          </Layout>
        </Route>
        <Route path="/privacy">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Privacy />
              </Suspense>
            </div>
          </Layout>
        </Route>
        <Route path="/changelog">
          <Layout>
            <MainNav />
            <div className="flex-1">
              <Suspense fallback={<LoadingScreen />}>
                <Changelog />
              </Suspense>
            </div>
          </Layout>
        </Route>

        {/* App pages with mini footer */}
        <Route path="*">
          <AppLayout>
            <MainNav />
            <div className="flex-1">
              <Switch>
                <Route path="/auth" component={Auth} />
                
                {/* Semi-protected routes - allow initial access but prompt for login for certain actions */}
                <SemiProtectedRoute path="/app" component={() => 
                  <Suspense fallback={<LoadingScreen message="Loading search interface..." />}>
                    <Home />
                  </Suspense>
                } />
                <SemiProtectedRoute path="/companies/:id" component={() => 
                  <Suspense fallback={<LoadingScreen message="Loading company details..." />}>
                    <CompanyDetails />
                  </Suspense>
                } />
                
                {/* Fully protected routes - require login */}
                <ProtectedRoute path="/account" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Account />
                  </Suspense>
                } />
                <ProtectedRoute path="/outreach" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Outreach />
                  </Suspense>
                } />
                <ProtectedRoute path="/streak" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Streak />
                  </Suspense>
                } />
                <ProtectedRoute path="/campaigns" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Campaigns />
                  </Suspense>
                } />
                <ProtectedRoute path="/contacts" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Contacts />
                  </Suspense>
                } />
                <ProtectedRoute path="/contacts/all-contacts" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AllContacts />
                  </Suspense>
                } />
                <ProtectedRoute path="/contacts/lists/:id" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <ContactListDetail />
                  </Suspense>
                } />
                <ProtectedRoute path="/contact-lists/:id" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <ContactListDetail />
                  </Suspense>
                } />
                <ProtectedRoute path="/replies" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Replies />
                  </Suspense>
                } />
                <ProtectedRoute path="/contacts/:id" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <ContactDetails />
                  </Suspense>
                } />
                <ProtectedRoute path="/testing" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <Testing />
                  </Suspense>
                } />
                <ProtectedRoute path="/strategy" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <StrategyDashboard />
                  </Suspense>
                } />
                
                {/* Admin routes - require login and admin privileges */}
                <ProtectedRoute path="/admin" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminDashboard />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/users" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminUsers />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/email" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminEmailTesting />
                  </Suspense>
                } />
                <ProtectedRoute path="/admin/testing" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminApiTesting />
                  </Suspense>
                } />
                
                {/* Subscription Success Page */}
                <Route path="/subscription-success" component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <SubscriptionSuccess />
                  </Suspense>
                } />
                
                {/* 404 Page */}
                <Route component={() => 
                  <Suspense fallback={<LoadingScreen />}>
                    <NotFound />
                  </Suspense>
                } />
              </Switch>
            </div>
          </AppLayout>
        </Route>
      </Switch>
      
      {/* Strategy Chat Overlay - will be rendered by StrategyOverlayProvider */}
    </>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RegistrationModalProvider>
          <StrategyOverlayProvider>
            <Router />
            <RegistrationModalContainer />
            <Toaster />
          </StrategyOverlayProvider>
        </RegistrationModalProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;