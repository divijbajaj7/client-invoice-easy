import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const invoiceSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  clientId: z.string().min(1, "Client is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  igstRate: z.number().min(0).max(100),
  sgstRate: z.number().min(0).max(100),
  cgstRate: z.number().min(0).max(100),
  notes: z.string().optional(),
});

interface InvoiceItem {
  id: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  rate: number;
  amount: number;
}

const CreateInvoice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      companyId: "",
      clientId: "",
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: "",
      igstRate: 0,
      sgstRate: 0,
      cgstRate: 0,
      notes: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [companiesResult, clientsResult] = await Promise.all([
        supabase.from("companies").select("*").eq("user_id", user.id),
        supabase.from("clients").select("*").eq("user_id", user.id),
      ]);

      if (companiesResult.data) setCompanies(companiesResult.data);
      if (clientsResult.data) setClients(clientsResult.data);
    };

    fetchData();
  }, [user]);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: "",
      hsnSacCode: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = updatedItem.quantity * updatedItem.rate;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const igstRate = form.watch("igstRate") || 0;
    const sgstRate = form.watch("sgstRate") || 0;
    const cgstRate = form.watch("cgstRate") || 0;
    const igstAmount = (subtotal * igstRate) / 100;
    const sgstAmount = (subtotal * sgstRate) / 100;
    const cgstAmount = (subtotal * cgstRate) / 100;
    const totalTax = igstAmount + sgstAmount + cgstAmount;
    const total = subtotal + totalTax;
    return { subtotal, igstAmount, sgstAmount, cgstAmount, totalTax, total };
  };

  const getNextInvoiceNumber = async () => {
    if (!user) return "1";
    
    try {
      const { data, error } = await supabase.rpc('get_next_invoice_number', {
        user_uuid: user.id
      });
      
      if (error) throw error;
      return data || "1";
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error getting next invoice number:', error);
      }
      return "1";
    }
  };

  // Set auto-incremented invoice number when component mounts (only if field is empty)
  useEffect(() => {
    const setInvoiceNumber = async () => {
      const currentValue = form.getValues('invoiceNumber');
      if (!currentValue) {
        const nextNumber = await getNextInvoiceNumber();
        form.setValue('invoiceNumber', nextNumber);
      }
    };
    
    if (user) {
      setInvoiceNumber();
    }
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
    if (!user) return;
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setLoading(true);

    try {
      const { subtotal, igstAmount, sgstAmount, cgstAmount, total } = calculateTotals();

      const { error } = await supabase.from("invoices").insert({
        user_id: user.id,
        company_id: values.companyId,
        client_id: values.clientId,
        invoice_number: values.invoiceNumber,
        invoice_date: values.invoiceDate,
        due_date: values.dueDate || null,
        subtotal,
        igst_rate: values.igstRate,
        igst_amount: igstAmount,
        sgst_rate: values.sgstRate,
        sgst_amount: sgstAmount,
        cgst_rate: values.cgstRate,
        cgst_amount: cgstAmount,
        total_amount: total,
        items: JSON.parse(JSON.stringify(items)),
        notes: values.notes || null,
        status: "draft",
      });

      if (error) throw error;

      toast.success("Invoice created successfully!");
      navigate("/dashboard");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error creating invoice:", error);
      }
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, igstAmount, sgstAmount, cgstAmount, totalTax, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/dashboard")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <FileText className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-2xl font-bold">Create New Invoice</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Name Header */}
        {form.watch("companyId") && (
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-primary">
              {companies.find(c => c.id === form.watch("companyId"))?.name} Invoice
            </h2>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input placeholder="INV-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoiceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="igstRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IGST Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sgstRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SGST Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cgstRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CGST Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Invoice Items</CardTitle>
                  <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                      <div className="col-span-3">
                        <Label>Description</Label>
                        <Input
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>HSN/SAC Code</Label>
                        <Input
                          placeholder="e.g., 998311"
                          value={item.hsnSacCode}
                          onChange={(e) => updateItem(item.id, 'hsnSacCode', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Rate</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Amount</Label>
                        <Input
                          value={item.amount.toFixed(2)}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No items added. Click "Add Item" to get started.
                    </div>
                  )}
                </div>

                {/* Totals */}
                {items.length > 0 && (
                  <div className="mt-6 space-y-2 text-right">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        {igstAmount > 0 && (
                          <div className="flex justify-between">
                            <span>IGST ({form.watch("igstRate")}%):</span>
                            <span>₹{igstAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {sgstAmount > 0 && (
                          <div className="flex justify-between">
                            <span>SGST ({form.watch("sgstRate")}%):</span>
                            <span>₹{sgstAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {cgstAmount > 0 && (
                          <div className="flex justify-between">
                            <span>CGST ({form.watch("cgstRate")}%):</span>
                            <span>₹{cgstAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>₹{total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes or terms..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default CreateInvoice;