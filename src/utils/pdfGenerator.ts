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
    address: invoice.companies?.address || "B-12 East Baldev park, Krishna Nagar, Delhi-110051",
    bankName: invoice.companies?.bank_name || "IDFC FIRST BANK",
    accountNumber: invoice.companies?.account_number || "79999858727",
    ifsc: invoice.companies?.ifsc_code || "IDFB0020138",
    branch: invoice.companies?.branch || "Mayur Vihar",
    pan: invoice.companies?.pan_number || "AAYFT2120L",
    gst: invoice.companies?.gst_number || "",
    phone: invoice.companies?.phone || "",
    email: invoice.companies?.email || ""
  };
  
  // Header with cyan color for company name and invoice title
  doc.setFillColor(96, 203, 204); // Cyan color
  doc.setTextColor(96, 203, 204);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyDetails.name, margin, 30);
  
  // Center the INVOICE title and show invoice number
  doc.setFontSize(24);
  const invoiceTitle = 'INVOICE';
  const titleWidth = doc.getTextWidth(invoiceTitle);
  doc.text(invoiceTitle, (pageWidth - titleWidth) / 2, 30);
  
  doc.setFontSize(14);
  const invoiceNumberText = `Invoice #${invoice.invoice_number}`;
  const numberWidth = doc.getTextWidth(invoiceNumberText);
  doc.text(invoiceNumberText, (pageWidth - numberWidth) / 2, 45);
  
  // Company address
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const addressLines = doc.splitTextToSize(companyDetails.address, 80);
  let yPos = 40;
  addressLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });
  
  // Invoice details on top right
  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoice.invoice_number}`, pageWidth - margin - 70, 45);
  doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-GB')}`, pageWidth - margin - 70, 55);
  if (companyDetails.gst) {
    doc.text(`GST No: ${companyDetails.gst}`, pageWidth - margin - 70, 65);
  }
  
  // Bill To section
  yPos = 85;
  doc.setTextColor(96, 203, 204);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', margin, yPos);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  yPos += 10;
  
  if (invoice.clients) {
    const clientName = invoice.clients.company_name || invoice.clients.name;
    doc.text(clientName, margin, yPos);
    
    if (invoice.clients.address) {
      yPos += 10;
      const addressLines = doc.splitTextToSize(invoice.clients.address, 80);
      addressLines.forEach((line: string) => {
        doc.text(line, margin, yPos);
        yPos += 5;
      });
    }
    
    if (invoice.clients.phone) {
      yPos += 5;
      doc.text(`Phone: ${invoice.clients.phone}`, margin, yPos);
    }
  }
  
  // Invoice and due dates on the right
  doc.text(`Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-GB')}`, pageWidth - margin - 70, 95);
  if (invoice.due_date) {
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('en-GB')}`, pageWidth - margin - 70, 105);
  }
  if (invoice.clients?.gst_number) {
    doc.text(`Customer GSTN: ${invoice.clients.gst_number}`, pageWidth - margin - 70, 115);
  }
  
  // Items table
  yPos += 25;
  const tableStartY = yPos;
  const colWidths = [15, 70, 25, 20, 25, 30];
  const colPositions = [
    margin, 
    margin + colWidths[0], 
    margin + colWidths[0] + colWidths[1], 
    margin + colWidths[0] + colWidths[1] + colWidths[2],
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]
  ];
  
  // Table header with cyan background
  doc.setFillColor(96, 203, 204);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ID', colPositions[0] + 2, yPos + 8);
  doc.text('Description', colPositions[1] + 2, yPos + 8);
  doc.text('HSN Code', colPositions[2] + 2, yPos + 8);
  doc.text('Qty', colPositions[3] + 2, yPos + 8);
  doc.text('Rate', colPositions[4] + 2, yPos + 8);
  doc.text('Amount', colPositions[5] + 2, yPos + 8);
  
  yPos += 12;
  
  // Table rows
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item, index) => {
      const rowHeight = 15;
      
      // Alternate row background
      if (index % 2 === 1) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight, 'F');
      }
      
      // Draw table borders
      doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight);
      
      // Draw vertical lines for columns
      colPositions.slice(1).forEach(pos => {
        doc.line(pos, tableStartY, pos, yPos + rowHeight);
      });
      
      doc.text((index + 1).toString(), colPositions[0] + 2, yPos + 10);
      
      // Handle long descriptions
      const descriptionLines = doc.splitTextToSize(item.description, colWidths[1] - 4);
      doc.text(descriptionLines, colPositions[1] + 2, yPos + 8);
      
      doc.text('', colPositions[2] + 2, yPos + 10); // HSN Code placeholder
      doc.text(item.quantity.toString(), colPositions[3] + 2, yPos + 10);
      doc.text(`₹ ${item.rate.toFixed(2)}`, colPositions[4] + 2, yPos + 10);
      doc.text(`₹ ${item.amount.toFixed(2)}`, colPositions[5] + 2, yPos + 10);
      
      yPos += rowHeight;
    });
  }
  
  // Thank you message
  yPos += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Thank you for your business!', margin, yPos);
  
  // Summary section
  yPos += 20;
  const summaryStartX = pageWidth - margin - 100;
  
  // Draw summary box
  const summaryData = [
    ['Sub total', `₹ ${invoice.subtotal.toFixed(2)}`],
    ['Discount', '₹ 0'],
    ['Tax Rate', `${invoice.gst_rate}%`],
    ['Tax', `₹ ${invoice.gst_amount.toFixed(2)}`],
    ['Shipping', '₹ 0'],
    ['Previous dues', '₹ 0']
  ];
  
  summaryData.forEach((row, index) => {
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], summaryStartX, yPos + (index * 8));
    doc.text(row[1], summaryStartX + 60, yPos + (index * 8));
  });
  
  // Total with cyan background
  const totalY = yPos + (summaryData.length * 8) + 5;
  doc.setFillColor(96, 203, 204);
  doc.rect(summaryStartX - 5, totalY - 8, 90, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total', summaryStartX, totalY);
  doc.text(`₹ ${invoice.total_amount.toFixed(2)}`, summaryStartX + 45, totalY);
  
  // Payment Details section
  doc.setTextColor(96, 203, 204);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Payment Details', margin, yPos);
  
  yPos += 15;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Account name: ${companyDetails.name}`, margin, yPos);
  doc.text(`• Account number: ${companyDetails.accountNumber}`, margin, yPos + 8);
  doc.text(`• Bank name: ${companyDetails.bankName}`, margin, yPos + 16);
  doc.text(`• IFSC code: ${companyDetails.ifsc}`, margin, yPos + 24);
  
  // Add border around the entire invoice
  doc.setLineWidth(0.5);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
  
  // Actually download the PDF
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
  
  return doc;
};