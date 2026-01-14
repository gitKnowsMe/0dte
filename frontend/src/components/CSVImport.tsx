import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, Download } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import Trades from CSV</h2>
              <p className="text-sm text-gray-600 mt-1">
                Upload your Robinhood CSV export to automatically import trades
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Sample download button */}
          <button
            onClick={downloadSample}
            className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Download size={16} />
            Download Sample CSV Format
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Area */}
          {!parseResult && !isUploading && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Upload className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Drop your Robinhood CSV here
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                or click to browse your files
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
              >
                Select CSV File
              </label>
            </div>
          )}

          {/* Loading State */}
          {isUploading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Parsing your CSV file...</p>
            </div>
          )}

          {/* Parse Results */}
          {parseResult && !isImporting && !importResult && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Parse Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Rows</p>
                    <p className="text-2xl font-bold text-gray-900">{parseResult.total_rows}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valid Trades</p>
                    <p className="text-2xl font-bold text-green-600">{parseResult.valid_trades}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Invalid</p>
                    <p className="text-2xl font-bold text-red-600">{parseResult.invalid_trades}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Warnings</p>
                    <p className="text-2xl font-bold text-yellow-600">{parseResult.warnings.length}</p>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertCircle size={18} />
                    Errors Found
                  </h4>
                  <ul className="space-y-1 text-sm text-red-800">
                    {parseResult.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                    {parseResult.errors.length > 5 && (
                      <li className="text-red-600">...and {parseResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">Warnings</h4>
                  <ul className="space-y-1 text-sm text-yellow-800">
                    {parseResult.warnings.slice(0, 3).map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                    {parseResult.warnings.length > 3 && (
                      <li className="text-yellow-600">...and {parseResult.warnings.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Trade Preview */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Trade Preview</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Strike</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contracts</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parseResult.trades.slice(0, 10).map((trade, idx) => (
                        <tr key={idx} className={!trade.is_valid ? 'bg-red-50' : ''}>
                          <td className="px-4 py-2">
                            {trade.is_valid ? (
                              <CheckCircle size={16} className="text-green-600" />
                            ) : (
                              <XCircle size={16} className="text-red-600" />
                            )}
                          </td>
                          <td className="px-4 py-2 font-medium">{trade.ticker}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              trade.option_type === 'call' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {trade.option_type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2">${trade.strike_price}</td>
                          <td className="px-4 py-2">${trade.entry_price}</td>
                          <td className="px-4 py-2">{trade.contracts}</td>
                          <td className="px-4 py-2">{trade.trans_code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parseResult.trades.length > 10 && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Showing 10 of {parseResult.trades.length} trades
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Importing State */}
          {isImporting && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Importing trades to your journal...</p>
            </div>
          )}

          {/* Import Success */}
          {importResult && (
            <div className="text-center py-12">
              <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Import Successful!</h3>
              <p className="text-gray-600">
                Successfully imported {importResult.imported} trades
              </p>
              {importResult.failed > 0 && (
                <p className="text-red-600 mt-2">
                  {importResult.failed} trades failed to import
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {parseResult && !isImporting && !importResult && (
          <div className="p-6 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={() => {
                setFile(null);
                setParseResult(null);
              }}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Upload Different File
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={parseResult.valid_trades === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <FileText size={18} />
                Import {parseResult.valid_trades} Trades
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
