import jsPDF from 'jspdf';

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  items: InvoiceItem[];
  notes?: string;
  companies?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    gst_number?: string;
    pan_number?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    branch?: string;
  };
  clients?: {
    name: string;
    company_name?: string;
    address?: string;
    phone?: string;
    email?: string;
    gst_number?: string;
  };
}

export const generateInvoicePDF = (invoice: InvoiceData) => {
  const doc = new jsPDF();
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  
  // Company details (use dynamic data from invoice or fallback to defaults)
  const companyDetails = {
    name: invoice.companies?.name || "THINKLYTICS AI CONSULTING LLP",
    address: invoice.companies?.address || "B-12, East Baldev Park, Krishna Nagar, Delhi-110051",
    bankName: invoice.companies?.bank_name || "IDFC FIRST BANK",
    accountNumber: invoice.companies?.account_number || "79999858727",
    ifsc: invoice.companies?.ifsc_code || "IDFB0020138",
    branch: invoice.companies?.branch || "Mayur Vihar",
    pan: invoice.companies?.pan_number || "AAYFT2120L",
    gst: invoice.companies?.gst_number || "",
    phone: invoice.companies?.phone || "+91-9999858727",
    email: invoice.companies?.email || "thinklyticsaiconsulting@gmail.com"
  };
  
  let yPos = 40;
  
  // Header - INVOICE title centered
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const invoiceTitle = 'INVOICE';
  const titleWidth = doc.getTextWidth(invoiceTitle);
  doc.text(invoiceTitle, (pageWidth - titleWidth) / 2, yPos);
  
  // Invoice number centered below title
  yPos += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  const invoiceNumberText = `Invoice #${invoice.invoice_number}`;
  const numberWidth = doc.getTextWidth(invoiceNumberText);
  doc.text(invoiceNumberText, (pageWidth - numberWidth) / 2, yPos);
  
  yPos += 25;
  
  // From and To sections side by side
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('From:', margin, yPos);
  doc.text('To:', pageWidth / 2 + 10, yPos);
  
  yPos += 10;
  
  // From section (Company details)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(companyDetails.name, margin, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  
  // Split company address into lines
  const fromAddressLines = doc.splitTextToSize(companyDetails.address, 80);
  fromAddressLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  
  if (companyDetails.phone) {
    doc.text(`Phone: ${companyDetails.phone}`, margin, yPos);
    yPos += 6;
  }
  
  if (companyDetails.email) {
    doc.text(`Email: ${companyDetails.email}`, margin, yPos);
  }
  
  // To section (Client details)
  let clientYPos = 85;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  if (invoice.clients) {
    const clientName = invoice.clients.name;
    doc.text(clientName, pageWidth / 2 + 10, clientYPos);
    
    clientYPos += 8;
    doc.setFont('helvetica', 'normal');
    
    if (invoice.clients.company_name) {
      doc.text(invoice.clients.company_name, pageWidth / 2 + 10, clientYPos);
      clientYPos += 6;
    }
    
    if (invoice.clients.address) {
      const toAddressLines = doc.splitTextToSize(invoice.clients.address, 80);
      toAddressLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2 + 10, clientYPos);
        clientYPos += 6;
      });
    }
    
    if (invoice.clients.phone) {
      doc.text(`Phone: ${invoice.clients.phone}`, pageWidth / 2 + 10, clientYPos);
      clientYPos += 6;
    }
    
    if (invoice.clients.email) {
      doc.text(`Email: ${invoice.clients.email}`, pageWidth / 2 + 10, clientYPos);
      clientYPos += 6;
    }
    
    if (invoice.clients.gst_number) {
      doc.text(`GST: ${invoice.clients.gst_number}`, pageWidth / 2 + 10, clientYPos);
    }
  }
  
  // Invoice Date
  yPos = Math.max(yPos, clientYPos) + 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text('Invoice Date', margin, yPos);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date(invoice.invoice_date).toLocaleDateString('en-GB'), margin, yPos + 8);
  
  yPos += 25;
  
  // Items table
  const tableStartY = yPos;
  const tableWidth = pageWidth - 2 * margin;
  
  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, tableWidth, 12, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Description', margin + 5, yPos + 8);
  doc.text('Quantity', pageWidth - 120, yPos + 8);
  doc.text('Rate', pageWidth - 80, yPos + 8);
  doc.text('Amount', pageWidth - 40, yPos + 8);
  
  yPos += 12;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item, index) => {
      const rowHeight = 15;
      
      // Row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos, tableWidth, rowHeight, 'F');
      }
      
      // Row border
      doc.setDrawColor(230, 230, 230);
      doc.rect(margin, yPos, tableWidth, rowHeight);
      
      doc.setTextColor(0, 0, 0);
      
      // Description
      const descLines = doc.splitTextToSize(item.description, 100);
      doc.text(descLines[0], margin + 5, yPos + 10);
      
      // Quantity, Rate, Amount (right aligned)
      doc.text(item.quantity.toString(), pageWidth - 115, yPos + 10);
      doc.text(`₹${item.rate.toLocaleString('en-IN')}`, pageWidth - 75, yPos + 10);
      doc.text(`₹${item.amount.toLocaleString('en-IN')}`, pageWidth - 35, yPos + 10);
      
      yPos += rowHeight;
    });
  }
  
  yPos += 15;
  
  // Totals section (right aligned)
  const totalsX = pageWidth - 120;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(`₹${invoice.subtotal.toLocaleString('en-IN')}`, pageWidth - 20, yPos);
  
  // Only show GST if there's a GST amount
  if (invoice.gst_amount > 0) {
    yPos += 10;
    doc.text('GST:', totalsX, yPos);
    doc.text(`₹${invoice.gst_amount.toLocaleString('en-IN')}`, pageWidth - 20, yPos);
  }
  
  // Total
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Total:', totalsX, yPos);
  doc.text(`₹${invoice.total_amount.toLocaleString('en-IN')}`, pageWidth - 20, yPos);
  
  yPos += 25;
  
  // Banking Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Banking Details:', margin, yPos);
  
  yPos += 15;
  
  // Banking details in a clean grid
  doc.setFillColor(245, 245, 245);
  const bankingBoxHeight = 50;
  doc.rect(margin, yPos, tableWidth, bankingBoxHeight, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  
  // Left column labels
  const labelX = margin + 10;
  const valueX = margin + 80;
  const rightLabelX = pageWidth / 2 + 20;
  const rightValueX = pageWidth / 2 + 90;
  
  doc.text('Bank Name', labelX, yPos + 12);
  doc.text('Account Number', labelX, yPos + 25);
  doc.text('Branch', labelX, yPos + 38);
  
  doc.text('Account Name', rightLabelX, yPos + 12);
  doc.text('IFSC Code', rightLabelX, yPos + 25);
  doc.text('PAN Number', rightLabelX, yPos + 38);
  
  // Values
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  
  doc.text(companyDetails.bankName, valueX, yPos + 12);
  doc.text(companyDetails.accountNumber, valueX, yPos + 25);
  doc.text(companyDetails.branch, valueX, yPos + 38);
  
  doc.text(companyDetails.name, rightValueX, yPos + 12);
  doc.text(companyDetails.ifsc, rightValueX, yPos + 25);
  doc.text(companyDetails.pan, rightValueX, yPos + 38);
  
  // Notes if any
  if (invoice.notes) {
    yPos += bankingBoxHeight + 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Notes:', margin, yPos);
    
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(64, 64, 64);
    const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
    noteLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 6;
    });
  }
  
  // Download the PDF
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
  
  return doc;
};