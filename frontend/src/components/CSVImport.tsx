import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Download, X } from 'lucide-react';

interface ParsedTrade {
  ticker: string;
  option_type: string;
  strike_price: number;
  entry_price: number;
  exit_price: number | null;
  entry_time: string;
  exit_time: string | null;
  contracts: number;
  fees: number;
  expiration_date: string | null;
  trans_code: string;
  amount: number;
  row_number: number;
  is_valid: boolean;
  error_message: string | null;
}

interface CSVParseResult {
  success: boolean;
  total_rows: number;
  valid_trades: number;
  invalid_trades: number;
  trades: ParsedTrade[];
  errors: Array<{ row: number; ticker?: string; error: string }>;
  warnings: string[];
}

interface CSVImportProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function CSVImport({ onClose, onImportSuccess }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      uploadAndParse(droppedFile);
    } else {
      alert('Please drop a CSV file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      uploadAndParse(selectedFile);
    }
  };

  const uploadAndParse = async (fileToUpload: File) => {
    setIsUploading(true);
    setParseResult(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('http://localhost:8000/api/import/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const result: CSVParseResult = await response.json();
      setParseResult(result);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to parse CSV file. Please check the format and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;

    setIsImporting(true);

    try {
      // Only import valid trades
      const validTrades = parseResult.trades.filter(t => t.is_valid);

      const response = await fetch('http://localhost:8000/api/import/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validTrades),
      });

      if (!response.ok) {
        throw new Error('Failed to import trades');
      }

      const result = await response.json();
      setImportResult(result);

      // Call success callback after short delay to show result
      setTimeout(() => {
        onImportSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import trades. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSample = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/import/sample');
      const data = await response.json();

      const blob = new Blob([data.sample_csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'robinhood_sample.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download sample:', error);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#1c2128',
          borderRadius: '12px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #30363d',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #30363d',
          backgroundColor: '#161b22'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#f0f6fc', marginBottom: '8px' }}>
                Import Trades from CSV
              </h2>
              <p style={{ fontSize: '14px', color: '#8b949e' }}>
                Upload your Robinhood CSV export to automatically import trades
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#8b949e',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#30363d';
                e.currentTarget.style.color = '#f0f6fc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#8b949e';
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Sample download button */}
          <button
            onClick={downloadSample}
            style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#58a6ff',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f6feb20'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Download size={16} />
            Download Sample CSV Format
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Upload Area */}
          {!parseResult && !isUploading && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragging ? '#58a6ff' : '#30363d'}`,
                borderRadius: '12px',
                padding: '60px 20px',
                textAlign: 'center',
                backgroundColor: isDragging ? '#1f6feb10' : '#0d1117',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              <Upload style={{ margin: '0 auto', color: '#8b949e', marginBottom: '16px' }} size={48} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f0f6fc', marginBottom: '8px' }}>
                Drop your Robinhood CSV here
              </h3>
              <p style={{ fontSize: '14px', color: '#8b949e', marginBottom: '16px' }}>
                or click to browse your files
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  backgroundColor: '#238636',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2ea043'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#238636'}
              >
                Select CSV File
              </label>
            </div>
          )}

          {/* Loading State */}
          {isUploading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid #30363d',
                borderTop: '3px solid #58a6ff',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: '#8b949e' }}>Parsing your CSV file...</p>
            </div>
          )}

          {/* Parse Results */}
          {parseResult && !isImporting && !importResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Summary */}
              <div style={{
                backgroundColor: '#0d1117',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #30363d'
              }}>
                <h3 style={{ fontWeight: '600', color: '#f0f6fc', marginBottom: '16px', fontSize: '16px' }}>
                  Parse Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px' }}>Total Rows</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#f0f6fc' }}>{parseResult.total_rows}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px' }}>Valid Trades</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#3fb950' }}>{parseResult.valid_trades}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px' }}>Invalid</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#f85149' }}>{parseResult.invalid_trades}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '4px' }}>Warnings</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', color: '#d29922' }}>{parseResult.warnings.length}</p>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div style={{
                  backgroundColor: '#f8514920',
                  border: '1px solid #f85149',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <h4 style={{
                    fontWeight: '600',
                    color: '#f85149',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}>
                    <AlertCircle size={18} />
                    Errors Found
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#ffa198' }}>
                    {parseResult.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                    {parseResult.errors.length > 5 && (
                      <li style={{ color: '#f85149' }}>...and {parseResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Trade Preview */}
              <div>
                <h4 style={{ fontWeight: '600', color: '#f0f6fc', marginBottom: '12px', fontSize: '14px' }}>
                  Trade Preview
                </h4>
                <div style={{
                  overflowX: 'auto',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  backgroundColor: '#0d1117'
                }}>
                  <table style={{
                    width: '100%',
                    fontSize: '13px',
                    borderCollapse: 'collapse'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#8b949e' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#8b949e' }}>Ticker</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#8b949e' }}>Type</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#8b949e' }}>Strike</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#8b949e' }}>Price</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#8b949e' }}>Contracts</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#8b949e' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.trades.slice(0, 10).map((trade, idx) => (
                        <tr
                          key={idx}
                          style={{
                            backgroundColor: !trade.is_valid ? '#f8514920' : 'transparent',
                            borderBottom: '1px solid #30363d'
                          }}
                        >
                          <td style={{ padding: '12px' }}>
                            {trade.is_valid ? (
                              <CheckCircle size={16} style={{ color: '#3fb950' }} />
                            ) : (
                              <XCircle size={16} style={{ color: '#f85149' }} />
                            )}
                          </td>
                          <td style={{ padding: '12px', fontWeight: '500', color: '#f0f6fc' }}>{trade.ticker}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: trade.option_type === 'call' ? '#3fb95020' : '#f8514920',
                              color: trade.option_type === 'call' ? '#3fb950' : '#f85149'
                            }}>
                              {trade.option_type.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#f0f6fc' }}>${trade.strike_price}</td>
                          <td style={{ padding: '12px', color: '#f0f6fc' }}>${trade.entry_price}</td>
                          <td style={{ padding: '12px', color: '#f0f6fc' }}>{trade.contracts}</td>
                          <td style={{ padding: '12px', color: '#8b949e' }}>{trade.trans_code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parseResult.trades.length > 10 && (
                    <p style={{
                      textAlign: 'center',
                      fontSize: '12px',
                      color: '#8b949e',
                      padding: '12px',
                      margin: 0
                    }}>
                      Showing 10 of {parseResult.trades.length} trades
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Importing State */}
          {isImporting && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid #30363d',
                borderTop: '3px solid #58a6ff',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: '#8b949e' }}>Importing trades to your journal...</p>
            </div>
          )}

          {/* Import Success */}
          {importResult && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <CheckCircle size={64} style={{ color: '#3fb950', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#f0f6fc', marginBottom: '8px' }}>
                Import Successful!
              </h3>
              <p style={{ color: '#8b949e' }}>
                Successfully imported {importResult.imported} trades
              </p>
              {importResult.failed > 0 && (
                <p style={{ color: '#f85149', marginTop: '8px' }}>
                  {importResult.failed} trades failed to import
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {parseResult && !isImporting && !importResult && (
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid #30363d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#161b22'
          }}>
            <button
              onClick={() => {
                setFile(null);
                setParseResult(null);
              }}
              style={{
                padding: '8px 16px',
                color: '#8b949e',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#30363d';
                e.currentTarget.style.color = '#f0f6fc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#8b949e';
              }}
            >
              Upload Different File
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #30363d',
                  color: '#f0f6fc',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#30363d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={parseResult.valid_trades === 0}
                style={{
                  padding: '10px 20px',
                  backgroundColor: parseResult.valid_trades === 0 ? '#30363d' : '#238636',
                  color: parseResult.valid_trades === 0 ? '#6e7681' : 'white',
                  borderRadius: '6px',
                  cursor: parseResult.valid_trades === 0 ? 'not-allowed' : 'pointer',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (parseResult.valid_trades > 0) {
                    e.currentTarget.style.backgroundColor = '#2ea043';
                  }
                }}
                onMouseLeave={(e) => {
                  if (parseResult.valid_trades > 0) {
                    e.currentTarget.style.backgroundColor = '#238636';
                  }
                }}
              >
                <FileText size={18} />
                Import {parseResult.valid_trades} Trades
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
