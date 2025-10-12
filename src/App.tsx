import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CreateInvoice from "./pages/CreateInvoice";
import EditInvoice from "./pages/EditInvoice";
import ManageClients from "./pages/ManageClients";
import ManageCompanies from "./pages/ManageCompanies";
import ViewInvoice from "./pages/ViewInvoice";
import InvoiceLedger from "./pages/InvoiceLedger";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-invoice" 
              element={
                <ProtectedRoute>
                  <CreateInvoice />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-invoice/:id" 
              element={
                <ProtectedRoute>
                  <EditInvoice />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manage-clients" 
              element={
                <ProtectedRoute>
                  <ManageClients />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manage-companies" 
              element={
                <ProtectedRoute>
                  <ManageCompanies />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/view-invoice/:id" 
              element={
                <ProtectedRoute>
                  <ViewInvoice />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/invoice-ledger" 
              element={
                <ProtectedRoute>
                  <InvoiceLedger />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
