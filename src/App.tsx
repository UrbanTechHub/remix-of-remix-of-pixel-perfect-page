import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import OTPPage from "./pages/OTPPage";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import PayTransferHub from "./pages/PayTransferHub";
import DomesticTransfer from "./pages/transfer/DomesticTransfer";
import InternationalTransfer from "./pages/transfer/InternationalTransfer";
import WireTransfer from "./pages/transfer/WireTransfer";
import TransferPin from "./pages/transfer/TransferPin";
import TransferSuccess from "./pages/transfer/TransferSuccess";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AccountTransactions from "./pages/AccountTransactions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/otp" element={<OTPPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/account/:accountId" element={<AccountTransactions />} />
            <Route path="/pay-transfer" element={<PayTransferHub />} />
            <Route path="/transfer/domestic" element={<DomesticTransfer />} />
            <Route path="/transfer/international" element={<InternationalTransfer />} />
            <Route path="/transfer/wire" element={<WireTransfer />} />
            <Route path="/transfer/pin" element={<TransferPin />} />
            <Route path="/transfer/success" element={<TransferSuccess />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
