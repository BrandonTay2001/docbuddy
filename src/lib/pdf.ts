interface MedicalDocumentData {
  patientName: string;
  patientAge: string;
  date: string;
  summary: string;
  examinationResults?: string; // New field
  diagnosis: string;
  prescription: string;
  treatmentPlan?: string;      // New field
  doctorNotes?: string;
}

// Helper function to sanitize text for HTML
const sanitizeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
};

export function generateMedicalDocumentHtml(data: MedicalDocumentData): string {
  // Sanitize the data
  const sanitizedSummary = sanitizeHtml(data.summary || '');
  const sanitizedExaminationResults = data.examinationResults ? sanitizeHtml(data.examinationResults) : '';
  const sanitizedDiagnosis = sanitizeHtml(data.diagnosis);
  const sanitizedPrescription = sanitizeHtml(data.prescription);
  const sanitizedTreatmentPlan = data.treatmentPlan ? sanitizeHtml(data.treatmentPlan) : '';
  const sanitizedNotes = data.doctorNotes ? sanitizeHtml(data.doctorNotes) : '';

  // Create the HTML document
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Medical Consultation Document - ${data.patientName}</title>
      <style>
        @media print {
          @page {
            size: A4;
            margin: 2cm;
          }
        }
        
        body {
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #444;
          padding-bottom: 10px;
        }
        
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .patient-info {
          margin-bottom: 30px;
        }
        
        .patient-info p {
          margin: 5px 0;
        }
        
        .section {
          margin-bottom: 30px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .section-content {
          padding-left: 10px;
        }
        
        .print-button {
          background-color: #4CAF50;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          display: block;
          margin: 20px auto;
        }
        
        .print-button:hover {
          background-color: #45a049;
        }
        
        @media print {
          .print-button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">MEDICAL CONSULTATION DOCUMENT</div>
        <div>Date: ${data.date}</div>
      </div>
      
      <div class="patient-info">
        <p><strong>Patient Name:</strong> ${data.patientName}</p>
        <p><strong>Patient Age:</strong> ${data.patientAge}</p>
      </div>
      
      <div class="section">
        <div class="section-title">Patient Complaint & Medical History</div>
        <div class="section-content">${sanitizedSummary}</div>
      </div>
      
      ${data.examinationResults ? `
      <div class="section">
        <div class="section-title">Examination Results</div>
        <div class="section-content">${sanitizedExaminationResults}</div>
      </div>
      ` : ''}
      
      <div class="section">
        <div class="section-title">Diagnosis</div>
        <div class="section-content">${sanitizedDiagnosis}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Management</div>
        <div class="section-content">${sanitizedPrescription}</div>
      </div>
      
      ${data.treatmentPlan ? `
      <div class="section">
        <div class="section-title">Plan</div>
        <div class="section-content">${sanitizedTreatmentPlan}</div>
      </div>
      ` : ''}
      
      ${data.doctorNotes ? `
      <div class="section">
        <div class="section-title">Additional Notes</div>
        <div class="section-content">${sanitizedNotes}</div>
      </div>
      ` : ''}
      
      <button class="print-button" onclick="window.print()">Print Document</button>
      
      <script>
        // Automatically open print dialog when document is loaded
        // window.onload = function() {
        //   window.print();
        // };
      </script>
    </body>
    </html>
  `;

  return html;
}

// Function to save the HTML to a blob and create a download link
export async function generateMedicalDocument(data: MedicalDocumentData): Promise<Uint8Array> {
  const html = generateMedicalDocumentHtml(data);
  
  // Create a blob from the HTML content
  const blob = new Blob([html], { type: 'text/html' });
  
  // Convert to Uint8Array for compatibility with the existing API
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}