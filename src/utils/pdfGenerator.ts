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
  
  // From section (Company details) - left side
  const leftColumnX = margin;
  const rightColumnX = pageWidth / 2 + 10;
  const maxColumnWidth = (pageWidth / 2) - 30;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(companyDetails.name, leftColumnX, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  
  // Split company address into lines with proper width
  const fromAddressLines = doc.splitTextToSize(companyDetails.address, maxColumnWidth);
  fromAddressLines.forEach((line: string) => {
    doc.text(line, leftColumnX, yPos);
    yPos += 6;
  });
  
  if (companyDetails.phone) {
    doc.text(`Phone: ${companyDetails.phone}`, leftColumnX, yPos);
    yPos += 6;
  }
  
  if (companyDetails.email) {
    const emailLines = doc.splitTextToSize(`Email: ${companyDetails.email}`, maxColumnWidth);
    emailLines.forEach((line: string) => {
      doc.text(line, leftColumnX, yPos);
      yPos += 6;
    });
  }
  
  // To section (Client details) - right side
  let clientYPos = 85;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  if (invoice.clients) {
    const clientName = invoice.clients.name;
    doc.text(clientName, rightColumnX, clientYPos);
    
    clientYPos += 8;
    doc.setFont('helvetica', 'normal');
    
    if (invoice.clients.company_name) {
      doc.text(invoice.clients.company_name, rightColumnX, clientYPos);
      clientYPos += 6;
    }
    
    if (invoice.clients.address) {
      const toAddressLines = doc.splitTextToSize(invoice.clients.address, maxColumnWidth);
      toAddressLines.forEach((line: string) => {
        doc.text(line, rightColumnX, clientYPos);
        clientYPos += 6;
      });
    }
    
    if (invoice.clients.phone) {
      doc.text(`Phone: ${invoice.clients.phone}`, rightColumnX, clientYPos);
      clientYPos += 6;
    }
    
    if (invoice.clients.email) {
      const emailLines = doc.splitTextToSize(`Email: ${invoice.clients.email}`, maxColumnWidth);
      emailLines.forEach((line: string) => {
        doc.text(line, rightColumnX, clientYPos);
        clientYPos += 6;
      });
    }
    
    if (invoice.clients.gst_number) {
      doc.text(`GST: ${invoice.clients.gst_number}`, rightColumnX, clientYPos);
    }
  }
  
  // Invoice Date
  yPos = Math.max(yPos, clientYPos) + 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text('Invoice Date', leftColumnX, yPos);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date(invoice.invoice_date).toLocaleDateString('en-GB'), leftColumnX, yPos + 8);
  
  yPos += 25;
  
  // Items table with proper column widths
  const tableStartY = yPos;
  const tableWidth = pageWidth - 2 * margin;
  
  // Column widths for proper alignment
  const descriptionWidth = tableWidth * 0.5;  // 50% for description
  const quantityWidth = tableWidth * 0.15;    // 15% for quantity  
  const rateWidth = tableWidth * 0.175;       // 17.5% for rate
  const amountWidth = tableWidth * 0.175;     // 17.5% for amount
  
  const descriptionX = margin + 5;
  const quantityX = margin + descriptionWidth;
  const rateX = quantityX + quantityWidth;
  const amountX = rateX + rateWidth;
  
  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, tableWidth, 12, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Description', descriptionX, yPos + 8);
  doc.text('Quantity', quantityX + 5, yPos + 8);
  doc.text('Rate', rateX + 5, yPos + 8);
  doc.text('Amount', amountX + 5, yPos + 8);
  
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
      
      // Description with proper width
      const descLines = doc.splitTextToSize(item.description, descriptionWidth - 10);
      doc.text(descLines[0], descriptionX, yPos + 10);
      
      // Quantity, Rate, Amount
      doc.text(item.quantity.toString(), quantityX + 5, yPos + 10);
      doc.text(`Rs${item.rate.toLocaleString('en-IN')}`, rateX + 5, yPos + 10);
      doc.text(`Rs${item.amount.toLocaleString('en-IN')}`, amountX + 5, yPos + 10);
      
      yPos += rowHeight;
    });
  }
  
  yPos += 15;
  
  // Totals section (right aligned with proper spacing)
  const totalsStartX = pageWidth - 80;
  const totalsValueX = pageWidth - 20;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.text('Subtotal:', totalsStartX, yPos);
  doc.text(`Rs${invoice.subtotal.toLocaleString('en-IN')}`, totalsValueX, yPos, { align: 'right' });
  
  // Only show GST if there's a GST amount
  if (invoice.gst_amount > 0) {
    yPos += 10;
    doc.text('GST:', totalsStartX, yPos);
    doc.text(`Rs${invoice.gst_amount.toLocaleString('en-IN')}`, totalsValueX, yPos, { align: 'right' });
  }
  
  // Total
  yPos += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Total:', totalsStartX, yPos);
  doc.text(`Rs${invoice.total_amount.toLocaleString('en-IN')}`, totalsValueX, yPos, { align: 'right' });
  
  yPos += 25;
  
  // Banking Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Banking Details:', leftColumnX, yPos);
  
  yPos += 15;
  
  // Banking details in a clean grid with proper spacing
  doc.setFillColor(245, 245, 245);
  const bankingBoxHeight = 60;
  const bankingTableWidth = pageWidth - 2 * margin;
  doc.rect(margin, yPos, bankingTableWidth, bankingBoxHeight, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  
  // Calculate proper spacing for banking details
  const bankingLabelX = margin + 10;
  const bankingValueX = margin + 90;
  const bankingRightLabelX = pageWidth / 2 + 10;
  const bankingRightValueX = pageWidth / 2 + 90;
  const maxBankingValueWidth = (pageWidth / 2) - 100;
  
  // Left column
  doc.text('Bank Name', bankingLabelX, yPos + 15);
  doc.text('Account Number', bankingLabelX, yPos + 30);
  doc.text('Branch', bankingLabelX, yPos + 45);
  
  // Right column
  doc.text('Account Name', bankingRightLabelX, yPos + 15);
  doc.text('IFSC Code', bankingRightLabelX, yPos + 30);
  doc.text('PAN Number', bankingRightLabelX, yPos + 45);
  
  // Values with proper text wrapping
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  
  // Left column values
  doc.text(companyDetails.bankName, bankingValueX, yPos + 15);
  doc.text(companyDetails.accountNumber, bankingValueX, yPos + 30);
  doc.text(companyDetails.branch, bankingValueX, yPos + 45);
  
  // Right column values with text wrapping for long company names
  const accountNameLines = doc.splitTextToSize(companyDetails.name, maxBankingValueWidth);
  doc.text(accountNameLines[0], bankingRightValueX, yPos + 15);
  
  doc.text(companyDetails.ifsc, bankingRightValueX, yPos + 30);
  doc.text(companyDetails.pan, bankingRightValueX, yPos + 45);
  
  // Notes if any
  if (invoice.notes) {
    yPos += bankingBoxHeight + 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Notes:', leftColumnX, yPos);
    
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(64, 64, 64);
    const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
    noteLines.forEach((line: string) => {
      doc.text(line, leftColumnX, yPos);
      yPos += 6;
    });
  }
  
  // Download the PDF
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
  
  return doc;
};