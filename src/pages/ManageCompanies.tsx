import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Building2, Save, Upload, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const ManageCompanies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [companyData, setCompanyData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    gst_number: "",
    pan_number: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    branch: "",
    logo_url: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      // Error handled silently
    }
  };

  const resetForm = () => {
    setCompanyData({
      name: "",
      address: "",
      phone: "",
      email: "",
      gst_number: "",
      pan_number: "",
      bank_name: "",
      account_number: "",
      ifsc_code: "",
      branch: "",
      logo_url: "",
    });
    setLogoFile(null);
    setLogoPreview(null);
    setEditingCompany(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (company: any) => {
    setCompanyData({
      name: company.name || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      gst_number: company.gst_number || "",
      pan_number: company.pan_number || "",
      bank_name: company.bank_name || "",
      account_number: company.account_number || "",
      ifsc_code: company.ifsc_code || "",
      branch: company.branch || "",
      logo_url: company.logo_url || "",
    });
    
    if (company.logo_url) {
      setLogoPreview(company.logo_url);
    }
    
    setEditingCompany(company);
    setIsDialogOpen(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null;

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, logoFile);

      if (uploadError) {
        return null;
      }

      const { data } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      return null;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!companyData.name.trim()) {
      toast({
        title: "Company name is required",
        description: "Please enter a company name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let logoUrl = companyData.logo_url;

      // Upload logo if a new file is selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      const dataToSave = {
        ...companyData,
        user_id: user.id,
        logo_url: logoUrl,
      };

      let result;
      if (editingCompany) {
        // Update existing company
        result = await supabase
          .from("companies")
          .update(dataToSave)
          .eq("id", editingCompany.id)
          .eq("user_id", user.id);
      } else {
        // Create new company
        result = await supabase
          .from("companies")
          .insert([dataToSave]);
      }

      if (result.error) {
        toast({
          title: "Error",
          description: "Failed to save company profile",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: editingCompany ? "Company updated successfully!" : "Company created successfully!",
      });

      setIsDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", companyId)
        .eq("user_id", user?.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete company",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Company deleted successfully",
      });

      fetchCompanies();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Manage Companies</h1>
          </div>
        </div>

        <div className="mb-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCompany ? "Edit Company" : "Add New Company"}
                </DialogTitle>
                <DialogDescription>
                  {editingCompany ? "Update company information" : "Enter company details to create a new company profile"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Company Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Company Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Company Name *</Label>
                        <Input
                          id="name"
                          value={companyData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="Enter company name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={companyData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="company@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={companyData.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        placeholder="Enter complete address"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={companyData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="+91 9876543210"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gst_number">GST Number</Label>
                        <Input
                          id="gst_number"
                          value={companyData.gst_number}
                          onChange={(e) => handleInputChange("gst_number", e.target.value)}
                          placeholder="22AAAAA0000A1Z5"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="pan_number">PAN Number</Label>
                      <Input
                        id="pan_number"
                        value={companyData.pan_number}
                        onChange={(e) => handleInputChange("pan_number", e.target.value)}
                        placeholder="AAAAA0000A"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Bank Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Bank Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input
                          id="bank_name"
                          value={companyData.bank_name}
                          onChange={(e) => handleInputChange("bank_name", e.target.value)}
                          placeholder="State Bank of India"
                        />
                      </div>
                      <div>
                        <Label htmlFor="account_number">Account Number</Label>
                        <Input
                          id="account_number"
                          value={companyData.account_number}
                          onChange={(e) => handleInputChange("account_number", e.target.value)}
                          placeholder="1234567890"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ifsc_code">IFSC Code</Label>
                        <Input
                          id="ifsc_code"
                          value={companyData.ifsc_code}
                          onChange={(e) => handleInputChange("ifsc_code", e.target.value)}
                          placeholder="SBIN0001234"
                        />
                      </div>
                      <div>
                        <Label htmlFor="branch">Branch</Label>
                        <Input
                          id="branch"
                          value={companyData.branch}
                          onChange={(e) => handleInputChange("branch", e.target.value)}
                          placeholder="Main Branch"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Logo */}
                <Card>
                  <CardHeader>
                    <CardTitle>Company Logo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="logo">Upload Logo</Label>
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="cursor-pointer"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Supported formats: JPG, PNG, GIF (max 5MB)
                      </p>
                    </div>

                    {logoPreview && (
                      <div className="flex items-center gap-4">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-20 w-20 object-contain border rounded"
                        />
                        <div className="text-sm text-muted-foreground">
                          Logo preview
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingCompany ? "Update Company" : "Create Company"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Companies List */}
        <div className="grid gap-4">
          {companies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No companies yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first company profile to start generating invoices
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Company
                </Button>
              </CardContent>
            </Card>
          ) : (
            companies.map((company) => (
              <Card key={company.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {company.logo_url && (
                        <img
                          src={company.logo_url}
                          alt={`${company.name} logo`}
                          className="h-16 w-16 object-contain border rounded"
                        />
                      )}
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">{company.name}</h3>
                        {company.email && (
                          <p className="text-sm text-muted-foreground">{company.email}</p>
                        )}
                        {company.address && (
                          <p className="text-sm text-muted-foreground">{company.address}</p>
                        )}
                        {company.phone && (
                          <p className="text-sm text-muted-foreground">Phone: {company.phone}</p>
                        )}
                        {company.gst_number && (
                          <p className="text-sm text-muted-foreground">GST: {company.gst_number}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(company)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Company</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{company.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(company.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageCompanies;