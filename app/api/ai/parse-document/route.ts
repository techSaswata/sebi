import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, AIJob } from '@/types/api';

// POST /api/ai/parse-document - Parse bond prospectus document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('document') as File;
    const documentType = formData.get('type') as string || 'prospectus';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No document provided' } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files.' } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' } as ApiResponse,
        { status: 400 }
      );
    }

    // Create AI job record
    const jobResult = await query(`
      INSERT INTO ai_jobs (
        job_type, input_ref, input_data, status
      ) VALUES (
        'document_parse', $1, $2, 'processing'
      ) RETURNING *
    `, [file.name, JSON.stringify({ 
      file_name: file.name, 
      file_size: file.size, 
      file_type: file.type,
      document_type: documentType
    })]);

    const job = jobResult.rows[0];

    try {
      // Extract text from document
      const extractedText = await extractTextFromFile(file);
      
      // Parse document using AI/LLM
      const parsedData = await parseProspectusDocument(extractedText, documentType);

      // Update job with results
      await query(`
        UPDATE ai_jobs 
        SET 
          output_json = $2,
          status = 'completed',
          confidence = $3,
          completed_at = NOW()
        WHERE id = $1
      `, [job.id, JSON.stringify(parsedData), parsedData.confidence]);

      return NextResponse.json({
        success: true,
        data: {
          job_id: job.id,
          parsed_data: parsedData,
          file_info: {
            name: file.name,
            size: file.size,
            type: file.type
          }
        },
        message: 'Document parsed successfully'
      } as ApiResponse);

    } catch (parseError) {
      // Update job with error
      await query(`
        UPDATE ai_jobs 
        SET 
          status = 'failed',
          error_message = $2,
          completed_at = NOW()
        WHERE id = $1
      `, [job.id, parseError instanceof Error ? parseError.message : 'Unknown error']);

      throw parseError;
    }

  } catch (error) {
    console.error('Error in document parsing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse document' } as ApiResponse,
      { status: 500 }
    );
  }
}

// Extract text from different file types
async function extractTextFromFile(file: File): Promise<string> {
  const _buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(_buffer);

  if (file.type === 'text/plain') {
    return new TextDecoder().decode(uint8Array);
  }

  if (file.type === 'application/pdf') {
    // For PDF, we would use a library like pdf2pic or pdf-parse
    // For now, return a placeholder that indicates PDF processing is needed
    return extractTextFromPDF(uint8Array);
  }

  // For other document types, implement appropriate extraction
  throw new Error(`Text extraction not implemented for file type: ${file.type}`);
}

// Placeholder PDF text extraction (replace with actual PDF parser)
async function extractTextFromPDF(_buffer: Uint8Array): Promise<string> {
  // In a real implementation, use libraries like:
  // - pdf-parse
  // - pdf2pic + OCR
  // - External API service
  
  // For demo purposes, return a sample prospectus text
  return `
    BOND OFFERING DOCUMENT
    
    Issuer: Sample Financial Services Ltd
    Bond Series: Series A Senior Secured Notes
    Face Value: ₹10,00,000 per bond
    Coupon Rate: 9.50% per annum
    Payment Frequency: Monthly
    Maturity Date: March 15, 2027
    Credit Rating: BBB+ (CRISIL)
    ISIN: INE123A07001
    
    TERMS AND CONDITIONS:
    
    1. ISSUE DETAILS
    - Total Issue Size: ₹500 Crores
    - Minimum Investment: ₹1,00,000
    - Issue Opens: January 15, 2025
    - Issue Closes: January 25, 2025
    
    2. REDEMPTION
    The bonds will be redeemed at par on the maturity date.
    
    3. INTEREST PAYMENT
    Interest will be paid monthly on the 15th of each month.
    
    4. SECURITY
    The bonds are secured by way of first charge on the company's assets.
    
    5. COVENANTS
    - Maintain debt-to-equity ratio below 2:1
    - No additional borrowings without lender consent
    - Quarterly financial reporting required
    
    RISK FACTORS:
    - Credit risk of the issuer
    - Interest rate risk
    - Liquidity risk
    - Market risk
  `;
}

// Parse prospectus document using AI/NLP
async function parseProspectusDocument(text: string, _documentType: string): Promise<any> {
  // In a real implementation, this would call an LLM API
  // For demo purposes, use regex and keyword extraction
  
  const parsedData = {
    issuer: extractFieldValue(text, ['issuer', 'company name', 'borrower']),
    bond_name: extractFieldValue(text, ['bond series', 'series', 'notes', 'debenture']),
    face_value: extractNumericValue(text, ['face value', 'denomination', 'par value']),
    coupon_rate: extractNumericValue(text, ['coupon rate', 'interest rate', 'rate of interest']),
    maturity_date: extractDate(text, ['maturity date', 'redemption date', 'expiry']),
    payment_frequency: extractFieldValue(text, ['payment frequency', 'interest payment', 'frequency']),
    credit_rating: extractFieldValue(text, ['credit rating', 'rating', 'grade']),
    credit_rating_agency: extractFieldValue(text, ['rating agency', 'crisil', 'icra', 'care', 'brickwork']),
    isin: extractFieldValue(text, ['isin', 'international securities identification number']),
    issue_size: extractNumericValue(text, ['issue size', 'total issue', 'total amount']),
    min_investment: extractNumericValue(text, ['minimum investment', 'minimum amount', 'min investment']),
    security_type: extractFieldValue(text, ['security', 'secured', 'unsecured']),
    use_of_proceeds: extractFieldValue(text, ['use of proceeds', 'purpose', 'utilization']),
    covenants: extractCovenants(text),
    risk_factors: extractRiskFactors(text),
    confidence: 0.0,
    extracted_fields: [],
    uncertain_fields: []
  };

  // Calculate confidence based on extracted fields
  const totalFields = Object.keys(parsedData).length - 3; // Exclude confidence, extracted_fields, uncertain_fields
  const extractedFields = Object.values(parsedData).filter(v => v !== null && v !== undefined && v !== '').length - 3;
  parsedData.confidence = Math.min(extractedFields / totalFields, 0.95);

  // Identify extracted and uncertain fields
  for (const [key, value] of Object.entries(parsedData)) {
    if (key === 'confidence' || key === 'extracted_fields' || key === 'uncertain_fields') continue;
    
    if (value && value !== '') {
      parsedData.extracted_fields.push(key);
    } else {
      parsedData.uncertain_fields.push(key);
    }
  }

  return parsedData;
}

function extractFieldValue(text: string, keywords: string[]): string | null {
  const lines = text.split('\n');
  
  for (const keyword of keywords) {
    for (const line of lines) {
      const regex = new RegExp(`${keyword}:?\\s*(.+)`, 'i');
      const match = line.match(regex);
      if (match) {
        return match[1].trim();
      }
    }
  }
  
  return null;
}

function extractNumericValue(text: string, keywords: string[]): number | null {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}:?\\s*[₹$]?\\s*([0-9,\\.]+)`, 'i');
    const match = text.match(regex);
    if (match) {
      const value = match[1].replace(/,/g, '');
      return parseFloat(value);
    }
  }
  
  return null;
}

function extractDate(text: string, keywords: string[]): string | null {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}:?\\s*([A-Za-z]+ \\d{1,2}, \\d{4}|\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{4}|\\d{4}-\\d{2}-\\d{2})`, 'i');
    const match = text.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractCovenants(text: string): string[] {
  const covenants = [];
  const covenantSection = text.match(/covenants?:?\s*([\s\S]*?)(?=\n[A-Z]|\n\d+\.|$)/i);
  
  if (covenantSection) {
    const lines = covenantSection[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length > 10) {
        covenants.push(trimmed);
      }
    }
  }
  
  return covenants;
}

function extractRiskFactors(text: string): string[] {
  const risks = [];
  const riskSection = text.match(/risk factors?:?\s*([\s\S]*?)(?=\n[A-Z]|\n\d+\.|$)/i);
  
  if (riskSection) {
    const lines = riskSection[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.includes('risk')) {
        risks.push(trimmed);
      }
    }
  }
  
  return risks;
}

// GET /api/ai/parse-document - Get document parsing jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    let whereClause = "WHERE job_type = 'document_parse'";
    const params = [limit];

    if (status) {
      whereClause += " AND status = $2";
      params.push(status);
    }

    const result = await query(`
      SELECT * FROM ai_jobs 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1
    `, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    } as ApiResponse<AIJob[]>);

  } catch (error) {
    console.error('Error fetching document parsing jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch parsing jobs' } as ApiResponse,
      { status: 500 }
    );
  }
}
