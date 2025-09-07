import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, 
  Users, 
  Building2, 
  Plus, 
  LogOut,
  Receipt,
  Download,
  Mail,
  Calendar,
  Eye
} from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("invoices");
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    {
      title: "Total Invoices",
      value: "0",
      icon: FileText,
      color: "text-blue-600 bg-blue-100"
    },
    {
      title: "Clients",
      value: "0", 
      icon: Users,
      color: "text-green-600 bg-green-100"
    },
    {
      title: "Companies",
      value: "0",
      icon: Building2,
      color: "text-orange-600 bg-orange-100"
    },
    {
      title: "This Month",
      value: "₹0",
      icon: Receipt,
      color: "text-purple-600 bg-purple-100"
    }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch invoices
        const { data: invoices, error: invoicesError } = await supabase
          .from("invoices")
          .select(`
            *,
            companies!invoices_company_id_fkey(name),
            clients!invoices_client_id_fkey(name)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (invoicesError) throw invoicesError;

        // Fetch clients count
        const { count: clientsCount, error: clientsError } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (clientsError) throw clientsError;

        // Fetch companies count
        const { count: companiesCount, error: companiesError } = await supabase
          .from("companies")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (companiesError) throw companiesError;

        // Calculate this month's total
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const thisMonthTotal = (invoices || [])
          .filter(invoice => invoice.created_at.startsWith(currentMonth))
          .reduce((total, invoice) => total + parseFloat(invoice.total_amount.toString()), 0);

        // Update stats
        setStats([
          {
            title: "Total Invoices",
            value: (invoices?.length || 0).toString(),
            icon: FileText,
            color: "text-blue-600 bg-blue-100"
          },
          {
            title: "Clients",
            value: (clientsCount || 0).toString(),
            icon: Users,
            color: "text-green-600 bg-green-100"
          },
          {
            title: "Companies",
            value: (companiesCount || 0).toString(),
            icon: Building2,
            color: "text-orange-600 bg-orange-100"
          },
          {
            title: "This Month",
            value: `₹${thisMonthTotal.toLocaleString('en-IN')}`,
            icon: Receipt,
            color: "text-purple-600 bg-purple-100"
          }
        ]);

        setRecentInvoices((invoices || []).slice(0, 5));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const generatePDF = async (invoice: any) => {
    try {
      // Dynamic import to avoid SSR issues
      const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
      const doc = generateInvoicePDF(invoice);
      doc.save(`invoice-${invoice.invoice_number}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const recentInvoicesOld = [
    // Placeholder data - will be replaced with real data
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Invoice Generator</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/create-invoice")}>
            <CardContent className="p-6 text-center">
              <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-4">
                <Plus className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Create New Invoice</h3>
              <p className="text-gray-600 text-sm">Generate a new invoice for your clients</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/manage-clients")}>
            <CardContent className="p-6 text-center">
              <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Manage Clients</h3>
              <p className="text-gray-600 text-sm">Add and organize your client information</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/company-profile")}>
            <CardContent className="p-6 text-center">
              <div className="bg-orange-100 p-3 rounded-full w-fit mx-auto mb-4">
                <Building2 className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Company Profile</h3>
              <p className="text-gray-600 text-sm">Set up your business details and bank info</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>Your latest invoice activity</CardDescription>
              </div>
              <Button onClick={() => navigate("/create-invoice")}>
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading invoices...</p>
              </div>
            ) : recentInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                <p className="text-gray-600 mb-4">Get started by creating your first invoice</p>
                <Button onClick={() => navigate("/create-invoice")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Invoice
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{invoice.invoice_number}</h4>
                          <p className="text-sm text-muted-foreground">
                            {invoice.clients?.name} • ₹{invoice.total_amount}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                        {invoice.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generatePDF(invoice)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Getting Started Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Follow these steps to set up your invoice generator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Set up your company profile</h4>
                  <p className="text-sm text-gray-600">Add your business details, logo, and GST information</p>
                </div>
                <Badge variant="outline">Step 1</Badge>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                <div className="bg-green-100 p-2 rounded-full">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Add your first client</h4>
                  <p className="text-sm text-gray-600">Create client profiles with contact and billing information</p>
                </div>
                <Badge variant="outline">Step 2</Badge>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
                <div className="bg-orange-100 p-2 rounded-full">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Create your first invoice</h4>
                  <p className="text-sm text-gray-600">Generate professional invoices with automatic GST calculations</p>
                </div>
                <Badge variant="outline">Step 3</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;