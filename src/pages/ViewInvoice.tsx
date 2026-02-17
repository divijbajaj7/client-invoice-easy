import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import html2canvas from "html2canvas";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  gst_amount: number;
  gst_rate: number;
  igst_amount: number;
  igst_rate: number;
  sgst_amount: number;
  sgst_rate: number;
  cgst_amount: number;
  cgst_rate: number;
  total_amount: number;
  status: string;
  invoice_type: string;
  notes: string | null;
  items: any;
  companies: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    gst_number: string | null;
    bank_name: string | null;
    account_number: string | null;
    ifsc_code: string | null;
    branch: string | null;
    pan_number: string | null;
  };
  clients: {
    name: string;
    company_name: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    gst_number: string | null;
    pan_number: string | null;
    cin_number: string | null;
  };
}

const ViewInvoice = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const fetchInvoice = async () => {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select(`
            *,
            companies (name, address, phone, email, gst_number, bank_name, account_number, ifsc_code, branch, pan_number),
            clients (name, company_name, address, phone, email, gst_number, pan_number, cin_number)
          `)
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setInvoice(data as Invoice);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching invoice:", error);
        }
        toast.error("Failed to load invoice");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [user, id, navigate]);

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    try {
      const invoiceData = {
        ...invoice,
        items: Array.isArray(invoice.items) ? invoice.items : []
      };
      await generateInvoicePDF(invoiceData);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error generating PDF:", error);
      }
      toast.error("Failed to generate PDF");
    }
  };

  const handleDownloadJPEG = async () => {
    if (!invoice) return;

    try {
      const element = document.getElementById('invoice-content');
      if (!element) {
        toast.error("Invoice content not found");
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `Invoice-${invoice.invoice_number}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();

      toast.success("JPEG downloaded successfully!");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error generating JPEG:", error);
      }
      toast.error("Failed to generate JPEG");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invoice not found</h2>
          <Button onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handleDownloadJPEG}>
              <Download className="h-4 w-4 mr-2" />
              Download JPEG
            </Button>
          </div>
        </div>

        <Card id="invoice-content">
          <CardHeader>
            <div className="text-center text-xl font-semibold text-primary mb-1">
              {invoice.companies.name}
            </div>
            <CardTitle className="text-3xl font-bold text-center">{(invoice.invoice_type || 'INVOICE').toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company and Client Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">From:</h3>
                <div className="space-y-1">
                  <p className="font-medium">{invoice.companies.name}</p>
                  {invoice.companies.address && <p>{invoice.companies.address}</p>}
                  {invoice.companies.phone && <p>Phone: {invoice.companies.phone}</p>}
                  {invoice.companies.email && <p>Email: {invoice.companies.email}</p>}
                  {invoice.companies.pan_number && <p>PAN: {invoice.companies.pan_number}</p>}
                  {invoice.companies.gst_number && <p>GST: {invoice.companies.gst_number}</p>}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">To:</h3>
                <div className="space-y-1">
                  <p className="font-medium">{invoice.clients.name}</p>
                  {invoice.clients.company_name && <p>{invoice.clients.company_name}</p>}
                  {invoice.clients.address && <p>{invoice.clients.address}</p>}
                  {invoice.clients.phone && <p>Phone: {invoice.clients.phone}</p>}
                  {invoice.clients.email && <p>Email: {invoice.clients.email}</p>}
                  {invoice.clients.gst_number && <p>GST: {invoice.clients.gst_number}</p>}
                  {invoice.clients.pan_number && <p>PAN: {invoice.clients.pan_number}</p>}
                  {invoice.clients.cin_number && <p>CIN: {invoice.clients.cin_number}</p>}
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="space-y-1">
              <div className="flex gap-2">
                <p className="text-sm text-muted-foreground">Invoice No:</p>
                <p className="text-sm font-medium">{invoice.invoice_number}</p>
              </div>
              <div className="flex gap-2">
                <p className="text-sm text-muted-foreground">Invoice Date:</p>
                <p className="text-sm font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
              </div>
              {invoice.due_date && (
                <div className="flex gap-2">
                  <p className="text-sm text-muted-foreground">Due Date:</p>
                  <p className="text-sm font-medium">{new Date(invoice.due_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3">Description</th>
                    <th className="text-left p-3">HSN/SAC</th>
                    <th className="text-right p-3">Quantity</th>
                    <th className="text-right p-3">Rate</th>
                    <th className="text-right p-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(invoice.items) && invoice.items.map((item: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{item.description}</td>
                      <td className="p-3">{item.hsnSacCode || '-'}</td>
                      <td className="text-right p-3">{item.quantity}</td>
                      <td className="text-right p-3">₹{parseFloat(item.rate).toLocaleString('en-IN')}</td>
                      <td className="text-right p-3">₹{parseFloat(item.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{parseFloat(invoice.subtotal.toString()).toLocaleString('en-IN')}</span>
                </div>
                {invoice.igst_amount > 0 && (
                  <div className="flex justify-between">
                    <span>IGST @ {invoice.igst_rate}%:</span>
                    <span>₹{parseFloat(invoice.igst_amount.toString()).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {invoice.sgst_amount > 0 && (
                  <div className="flex justify-between">
                    <span>SGST @ {invoice.sgst_rate}%:</span>
                    <span>₹{parseFloat(invoice.sgst_amount.toString()).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {invoice.cgst_amount > 0 && (
                  <div className="flex justify-between">
                    <span>CGST @ {invoice.cgst_rate}%:</span>
                    <span>₹{parseFloat(invoice.cgst_amount.toString()).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>₹{parseFloat(invoice.total_amount.toString()).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Banking Details */}
            <div>
              <h3 className="font-semibold text-lg mb-2">Banking Details:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Bank Name</p>
                  <p className="font-medium">{invoice.companies.bank_name || "IDFC FIRST BANK"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Name</p>
                  <p className="font-medium">{invoice.companies.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Number</p>
                  <p className="font-medium">{invoice.companies.account_number || "79999858727"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IFSC Code</p>
                  <p className="font-medium">{invoice.companies.ifsc_code || "IDFB0020138"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Branch</p>
                  <p className="font-medium">{invoice.companies.branch || "Mayur Vihar"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PAN Number</p>
                  <p className="font-medium">{invoice.companies.pan_number || "AAYFT2120L"}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div>
                <h3 className="font-semibold mb-2">Notes:</h3>
                <p className="text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewInvoice;