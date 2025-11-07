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
import { ArrowLeft, Eye, Edit, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const InvoiceLedger = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const filteredInvoices = invoices?.filter((invoice) => {
    if (statusFilter === 'all') return true;
    return invoice.status === statusFilter;
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

  const exportToCSV = (invoice: any) => {
    const csvData = [
      ['Invoice Details'],
      ['Invoice Number', invoice.invoice_number],
      ['Date', format(new Date(invoice.invoice_date), 'dd MMM yyyy')],
      ['Client', invoice.clients?.company_name || invoice.clients?.name],
      ['Status', invoice.status],
      [],
      ['Item Details'],
      ['Description', 'Quantity', 'Rate', 'Amount'],
      ...(invoice.items || []).map((item: any) => [
        item.description,
        item.quantity,
        item.rate,
        item.amount
      ]),
      [],
      ['Summary'],
      ['Subtotal', invoice.subtotal],
      ['IGST', invoice.igst_amount || 0],
      ['CGST', invoice.cgst_amount || 0],
      ['SGST', invoice.sgst_amount || 0],
      ['Total Amount', invoice.total_amount],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoice_${invoice.invoice_number}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <Button onClick={exportTableToCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export as File
          </Button>
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

        {/* Filter */}
        <div className="mb-4">
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
                          onClick={() => exportToCSV(invoice)}
                          title="Export as CSV"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/edit-invoice/${invoice.id}`)}
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
