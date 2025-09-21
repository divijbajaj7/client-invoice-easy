import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const invoiceSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  clientId: z.string().min(1, "Client is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  gstRate: z.number().min(0).max(100),
  notes: z.string().optional(),
});

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

const EditInvoice = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      companyId: "",
      clientId: "",
      invoiceNumber: "",
      invoiceDate: "",
      dueDate: "",
      gstRate: 18,
      notes: "",
    },
  });

  // Fetch invoice data and populate form
  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (!user || !id) return;

      try {
        const { data: invoice, error } = await supabase
          .from("invoices")
          .select(`
            *,
            companies!invoices_company_id_fkey(id, name),
            clients!invoices_client_id_fkey(id, name)
          `)
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        // Populate form with existing data
        form.reset({
          companyId: invoice.company_id,
          clientId: invoice.client_id,
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          dueDate: invoice.due_date || "",
          gstRate: invoice.gst_rate,
          notes: invoice.notes || "",
        });

        // Set items
        setItems(Array.isArray(invoice.items) ? (invoice.items as unknown as InvoiceItem[]) : []);
      } catch (error) {
        console.error("Error fetching invoice:", error);
        toast.error("Failed to load invoice");
        navigate("/dashboard");
      } finally {
        setPageLoading(false);
      }
    };

    fetchInvoiceData();
  }, [user, id, form, navigate]);

  // Fetch companies and clients
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [companiesResult, clientsResult] = await Promise.all([
          supabase.from("companies").select("*").eq("user_id", user.id),
          supabase.from("clients").select("*").eq("user_id", user.id),
        ]);

        if (companiesResult.error) throw companiesResult.error;
        if (clientsResult.error) throw clientsResult.error;

        setCompanies(companiesResult.data || []);
        setClients(clientsResult.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load companies or clients");
      }
    };

    fetchData();
  }, [user]);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "rate") {
      newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].rate);
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const gstRate = form.watch("gstRate") || 0;
    const gstAmount = (subtotal * gstRate) / 100;
    const total = subtotal + gstAmount;
    return { subtotal, gstAmount, total };
  };

  const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
    if (!user || !id) return;
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setLoading(true);

    try {
      const { subtotal, gstAmount, total } = calculateTotals();

      const { error } = await supabase
        .from("invoices")
        .update({
          company_id: values.companyId,
          client_id: values.clientId,
          invoice_number: values.invoiceNumber,
          invoice_date: values.invoiceDate,
          due_date: values.dueDate || null,
          subtotal,
          gst_rate: values.gstRate,
          gst_amount: gstAmount,
          total_amount: total,
          items: JSON.parse(JSON.stringify(items)),
          notes: values.notes || null,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Invoice updated successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to update invoice");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { subtotal, gstAmount, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Edit Invoice</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a company" />
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a client" />
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
                    name="gstRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="18"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Line Items</CardTitle>
                  <Button type="button" onClick={addItem} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end p-4 border rounded-lg">
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Description</label>
                        <Input
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Quantity</label>
                        <Input
                          type="number"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Rate</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) => updateItem(index, "rate", Number(e.target.value))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Amount</label>
                          <div className="text-lg font-semibold">₹{item.amount.toFixed(2)}</div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No items added yet. Click "Add Item" to get started.
                    </div>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="mt-6 space-y-2 text-right">
                    <div className="flex justify-end">
                      <div className="w-64">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST ({form.watch("gstRate")}%):</span>
                          <span>₹{gstAmount.toFixed(2)}</span>
                        </div>
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
                          placeholder="Any additional notes or terms..."
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

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Invoice"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EditInvoice;