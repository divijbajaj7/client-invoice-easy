import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Edit, Download, FileText, Image, CalendarIcon, Images } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';

const InvoiceLedger = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [bulkDownloadOpen, setBulkDownloadOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (
            name,
            company_name
          ),
          companies (
            name,
            address,
            phone,
            email,
            gst_number,
            bank_name,
            account_number,
            ifsc_code,
            branch,
            pan_number
          )
        `)
        .eq('user_id', user?.id)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Status updated',
        description: 'Invoice status has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update status: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const uniqueClients = Array.from(
    new Set(
      invoices?.map((inv) => inv.clients?.company_name || inv.clients?.name || 'Unknown')
    )
  ).sort();

  const filteredInvoices = invoices?.filter((invoice) => {
    const statusMatch = statusFilter === 'all' || invoice.status === statusFilter;
    const clientMatch = clientFilter === 'all' || 
      (invoice.clients?.company_name || invoice.clients?.name) === clientFilter;
    return statusMatch && clientMatch;
  });

  const totalAmount = filteredInvoices?.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount),
    0
  );

  const receivedAmount = filteredInvoices
    ?.filter((inv) => inv.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);

  const pendingAmount = filteredInvoices
    ?.filter((inv) => inv.status !== 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);

  const totalGst = filteredInvoices?.reduce(
    (sum, invoice) => sum + Number(invoice.igst_amount || 0) + Number(invoice.cgst_amount || 0) + Number(invoice.sgst_amount || 0),
    0
  );

  const generateInvoiceJPEG = async (invoice: any): Promise<string | null> => {
    // Create a temporary container for the invoice
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.backgroundColor = '#ffffff';
    container.style.padding = '32px';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    
    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-size: 20px; font-weight: 600; color: #3b82f6; margin-bottom: 4px;">
          ${invoice.companies?.name || 'Company'}
        </div>
        <div style="font-size: 28px; font-weight: bold;">INVOICE</div>
        <div style="color: #6b7280;">Invoice #${invoice.invoice_number}</div>
      </div>
      
      <div style="display: flex; gap: 24px; margin-bottom: 24px;">
        <div style="flex: 1;">
          <h3 style="font-weight: 600; margin-bottom: 8px;">From:</h3>
          <p style="font-weight: 500;">${invoice.companies?.name || ''}</p>
          ${invoice.companies?.address ? `<p>${invoice.companies.address}</p>` : ''}
          ${invoice.companies?.phone ? `<p>Phone: ${invoice.companies.phone}</p>` : ''}
          ${invoice.companies?.email ? `<p>Email: ${invoice.companies.email}</p>` : ''}
          ${invoice.companies?.gst_number ? `<p>GST: ${invoice.companies.gst_number}</p>` : ''}
        </div>
        <div style="flex: 1;">
          <h3 style="font-weight: 600; margin-bottom: 8px;">To:</h3>
          <p style="font-weight: 500;">${invoice.clients?.name || ''}</p>
          ${invoice.clients?.company_name ? `<p>${invoice.clients.company_name}</p>` : ''}
          ${invoice.clients?.address ? `<p>${invoice.clients.address}</p>` : ''}
          ${invoice.clients?.phone ? `<p>Phone: ${invoice.clients.phone}</p>` : ''}
          ${invoice.clients?.email ? `<p>Email: ${invoice.clients.email}</p>` : ''}
          ${invoice.clients?.gst_number ? `<p>GST: ${invoice.clients.gst_number}</p>` : ''}
        </div>
      </div>
      
      <div style="margin-bottom: 24px;">
        <p><strong>Invoice Date:</strong> ${format(new Date(invoice.invoice_date), 'dd MMM yyyy')}</p>
        ${invoice.due_date ? `<p><strong>Due Date:</strong> ${format(new Date(invoice.due_date), 'dd MMM yyyy')}</p>` : ''}
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="text-align: left; padding: 12px; border: 1px solid #e5e7eb;">Description</th>
            <th style="text-align: left; padding: 12px; border: 1px solid #e5e7eb;">HSN/SAC</th>
            <th style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">Qty</th>
            <th style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">Rate</th>
            <th style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.description}</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${item.hsnSacCode || '-'}</td>
              <td style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">${item.quantity}</td>
              <td style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">₹${parseFloat(item.rate).toLocaleString('en-IN')}</td>
              <td style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">₹${parseFloat(item.amount).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
        <div style="width: 250px;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span>Subtotal:</span>
            <span>₹${parseFloat(invoice.subtotal).toLocaleString('en-IN')}</span>
          </div>
          ${invoice.igst_amount > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span>IGST @ ${invoice.igst_rate}%:</span>
              <span>₹${parseFloat(invoice.igst_amount).toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${invoice.sgst_amount > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span>SGST @ ${invoice.sgst_rate}%:</span>
              <span>₹${parseFloat(invoice.sgst_amount).toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${invoice.cgst_amount > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 4px 0;">
              <span>CGST @ ${invoice.cgst_rate}%:</span>
              <span>₹${parseFloat(invoice.cgst_amount).toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #000; font-weight: bold; font-size: 18px;">
            <span>Total:</span>
            <span>₹${parseFloat(invoice.total_amount).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h3 style="font-weight: 600; margin-bottom: 12px;">Banking Details:</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <p style="color: #6b7280; font-size: 14px;">Bank Name</p>
            <p style="font-weight: 500;">${invoice.companies?.bank_name || '-'}</p>
          </div>
          <div>
            <p style="color: #6b7280; font-size: 14px;">Account Number</p>
            <p style="font-weight: 500;">${invoice.companies?.account_number || '-'}</p>
          </div>
          <div>
            <p style="color: #6b7280; font-size: 14px;">IFSC Code</p>
            <p style="font-weight: 500;">${invoice.companies?.ifsc_code || '-'}</p>
          </div>
          <div>
            <p style="color: #6b7280; font-size: 14px;">Branch</p>
            <p style="font-weight: 500;">${invoice.companies?.branch || '-'}</p>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; color: #6b7280; font-size: 12px; font-style: italic;">
        This invoice is electronically generated and does not require a physical signature.
      </div>
    `;
    
    document.body.appendChild(container);
    
    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      document.body.removeChild(container);
      return dataUrl;
    } catch (error) {
      document.body.removeChild(container);
      console.error('Error generating JPEG:', error);
      return null;
    }
  };

  const downloadInvoiceJPEG = async (invoice: any) => {
    toast({
      title: 'Generating JPEG...',
      description: 'Please wait while we generate your invoice.',
    });
    
    const dataUrl = await generateInvoiceJPEG(invoice);
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `Invoice-${invoice.invoice_number}.jpg`;
      link.href = dataUrl;
      link.click();
      
      toast({
        title: 'Download complete',
        description: `Invoice ${invoice.invoice_number} downloaded successfully.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to generate JPEG.',
        variant: 'destructive',
      });
    }
  };

  const exportTableToCSV = () => {
    if (!filteredInvoices || filteredInvoices.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no invoices to export.',
        variant: 'destructive',
      });
      return;
    }

    const csvData = [
      ['Date', 'Invoice #', 'Client', 'Amount', 'GST Amount', 'Status'],
      ...filteredInvoices.map((invoice) => [
        format(new Date(invoice.invoice_date), 'dd MMM yyyy'),
        invoice.invoice_number,
        invoice.clients?.company_name || invoice.clients?.name,
        Number(invoice.total_amount).toFixed(2),
        (Number(invoice.igst_amount || 0) + Number(invoice.cgst_amount || 0) + Number(invoice.sgst_amount || 0)).toFixed(2),
        invoice.status,
      ]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoice_ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export successful',
      description: 'Invoice ledger has been exported to CSV.',
    });
  };

  const downloadBulkJPEGs = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Select date range',
        description: 'Please select both start and end dates.',
        variant: 'destructive',
      });
      return;
    }

    const invoicesInRange = invoices?.filter((invoice) => {
      const invoiceDate = new Date(invoice.invoice_date);
      return invoiceDate >= startDate && invoiceDate <= endDate;
    });

    if (!invoicesInRange || invoicesInRange.length === 0) {
      toast({
        title: 'No invoices found',
        description: 'No invoices found in the selected date range.',
        variant: 'destructive',
      });
      return;
    }

    setIsDownloading(true);
    toast({
      title: 'Generating invoices...',
      description: `Downloading ${invoicesInRange.length} invoice(s). Please wait...`,
    });

    for (const invoice of invoicesInRange) {
      const dataUrl = await generateInvoiceJPEG(invoice);
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `Invoice-${invoice.invoice_number}.jpg`;
        link.href = dataUrl;
        link.click();
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsDownloading(false);
    setBulkDownloadOpen(false);
    toast({
      title: 'Download complete',
      description: `${invoicesInRange.length} invoice(s) downloaded successfully.`,
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Invoice Ledger</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={bulkDownloadOpen} onOpenChange={setBulkDownloadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Images className="w-4 h-4" />
                  Download All Invoices
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Download Invoices by Date Range</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Select start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : "Select end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button 
                    onClick={downloadBulkJPEGs} 
                    className="w-full gap-2"
                    disabled={isDownloading}
                  >
                    <Download className="w-4 h-4" />
                    {isDownloading ? 'Downloading...' : 'Download All JPEGs'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={exportTableToCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Export as CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold">₹{totalAmount?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Total GST</p>
            <p className="text-2xl font-bold">₹{totalGst?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Received</p>
            <p className="text-2xl font-bold text-green-600">₹{receivedAmount?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-orange-600">₹{pendingAmount?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {uniqueClients.map((client) => (
                <SelectItem key={client} value={client}>
                  {client}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>GST Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {invoice.clients?.company_name || invoice.clients?.name}
                    </TableCell>
                    <TableCell>₹{Number(invoice.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      ₹{(Number(invoice.igst_amount || 0) + Number(invoice.cgst_amount || 0) + Number(invoice.sgst_amount || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={invoice.status || 'draft'}
                        onValueChange={(value) =>
                          updateStatusMutation.mutate({ id: invoice.id, status: value })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/view-invoice/${invoice.id}`)}
                          title="View Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadInvoiceJPEG(invoice)}
                          title="Download as JPEG"
                        >
                          <Image className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/edit-invoice/${invoice.id}`)}
                          title="Edit Invoice"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceLedger;