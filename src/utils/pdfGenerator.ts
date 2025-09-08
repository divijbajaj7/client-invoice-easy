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
    pan: invoice.companies?.pan_number || "AAYFT2120L"
  };
  
  // Header - Invoice title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice', pageWidth - margin - 35, 30);
  
  // Company details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Name of Issuer :- ' + companyDetails.name, margin, 50);
  doc.setFont('helvetica', 'normal');
  doc.text('Current Address :- ' + companyDetails.address, margin, 60);
  
  // Invoice details box
  let yPos = 80;
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice No.: ${invoice.invoice_number}`, margin, yPos);
  doc.text(`Invoice Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-GB')}`, margin, yPos + 10);
  
  // Bill To section
  yPos += 30;
  doc.text('Bill To:', margin, yPos);
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  
  if (invoice.clients) {
    const clientName = invoice.clients.company_name || invoice.clients.name;
    doc.text(clientName, margin, yPos);
    
    if (invoice.clients.address) {
      yPos += 10;
      const addressLines = doc.splitTextToSize(invoice.clients.address, pageWidth - 2 * margin);
      doc.text(addressLines, margin, yPos);
      yPos += addressLines.length * 5;
    }
    
    if (invoice.clients.gst_number) {
      yPos += 10;
      doc.text(`PIN Code: ${invoice.clients.gst_number}`, margin, yPos);
    }
  }
  
  // Items table
  yPos += 30;
  const tableStartY = yPos;
  const colWidths = [20, 110, 30, 30];
  const colPositions = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];
  
  // Table header
  doc.setFont('helvetica', 'bold');
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10);
  doc.text('Sr. No.', colPositions[0] + 2, yPos + 7);
  doc.text('Description of Service', colPositions[1] + 2, yPos + 7);
  doc.text('Rate', colPositions[2] + 2, yPos + 7);
  doc.text('Amount (Rs.)', colPositions[3] + 2, yPos + 7);
  
  yPos += 10;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item, index) => {
      const rowHeight = 15;
      doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight);
      
      // Draw vertical lines for columns
      colPositions.slice(1).forEach(pos => {
        doc.line(pos, tableStartY, pos, yPos + rowHeight);
      });
      
      doc.text((index + 1).toString(), colPositions[0] + 2, yPos + 10);
      
      // Handle long descriptions
      const descriptionLines = doc.splitTextToSize(item.description, colWidths[1] - 4);
      doc.text(descriptionLines, colPositions[1] + 2, yPos + 7);
      
      doc.text(`${item.rate}*${item.quantity}`, colPositions[2] + 2, yPos + 10);
      doc.text(item.amount.toFixed(0), colPositions[3] + 2, yPos + 10);
      
      yPos += rowHeight;
    });
  }
  
  // Total row
  doc.setFont('helvetica', 'bold');
  doc.rect(margin, yPos, pageWidth - 2 * margin, 15);
  colPositions.slice(1).forEach(pos => {
    doc.line(pos, tableStartY, pos, yPos + 15);
  });
  
  // Convert number to words
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];
    
    if (num === 0) return 'Zero';
    
    const convertHundreds = (n: number): string => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        return result;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };
    
    let result = '';
    let groupIndex = 0;
    
    while (num > 0) {
      const group = num % (groupIndex === 0 ? 1000 : 100);
      if (group !== 0) {
        result = convertHundreds(group) + thousands[groupIndex] + ' ' + result;
      }
      num = Math.floor(num / (groupIndex === 0 ? 1000 : 100));
      groupIndex++;
    }
    
    return result.trim() + ' Only';
  };
  
  doc.text(`Amount in words(in Rs.): ${numberToWords(Math.floor(invoice.total_amount))}`, colPositions[1] + 2, yPos + 10);
  doc.text('Total', colPositions[2] + 2, yPos + 10);
  doc.text(Math.floor(invoice.total_amount).toString(), colPositions[3] + 2, yPos + 10);
  
  yPos += 30;
  
  // Banking details
  doc.setFont('helvetica', 'bold');
  doc.text(`Account Holder Name :- ${companyDetails.name}`, margin, yPos);
  doc.text(`Bank Name :- ${companyDetails.bankName}`, margin, yPos + 10);
  doc.text(`A/C Number :- ${companyDetails.accountNumber}`, margin, yPos + 20);
  doc.text(`IFSC :- ${companyDetails.ifsc}`, margin, yPos + 30);
  doc.text(`Branch :- ${companyDetails.branch}`, margin, yPos + 40);
  doc.text(`PAN :- ${companyDetails.pan}`, margin, yPos + 50);
  
  // Signature
  doc.text('Signature', pageWidth - margin - 40, yPos + 50);
  
  // Add border around the entire invoice
  doc.setLineWidth(1);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  
  // Actually download the PDF
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
  
  return doc;
};