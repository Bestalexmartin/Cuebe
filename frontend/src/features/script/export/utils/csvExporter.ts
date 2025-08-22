// frontend/src/features/script/export/utils/csvExporter.ts

import { formatTimeOffset } from '../../../../utils/timeUtils';

export interface ScriptExportData {
  script: {
    script_id: string;
    script_name: string;
    script_status: string;
    start_time?: string;
    end_time?: string;
    script_notes?: string;
  };
  elements: Array<{
    element_id: string;
    element_type: 'CUE' | 'NOTE' | 'GROUP';
    element_name: string;
    cue_notes?: string;
    offset_ms: number;
    duration_ms?: number;
    sequence: number;
    priority: string;
    location_details?: string;
    custom_color?: string;
    group_level: number;
    parent_element_id?: string;
    department_name?: string;
    department_initials?: string;
  }>;
}

/**
 * Build group path from element hierarchy
 * Reconstructs "Act 1/Scene 1" style paths from parent relationships
 */
const buildGroupPath = (
  element: ScriptExportData['elements'][0],
  allElements: ScriptExportData['elements']
): string => {
  if (element.group_level === 0) {
    return '';
  }

  const pathSegments: string[] = [];
  let currentElement = element;

  // Walk up the parent chain to build the full path
  while (currentElement && currentElement.group_level > 0) {
    // Find the parent group at the previous level
    const parentLevel = currentElement.group_level - 1;
    const parent = allElements.find(el => 
      el.element_type === 'GROUP' && 
      el.group_level === parentLevel &&
      el.sequence < currentElement.sequence
    );

    if (parent) {
      pathSegments.unshift(parent.element_name);
      currentElement = parent;
    } else {
      break;
    }
  }

  return pathSegments.join('/');
};

/**
 * Convert script data to CSV format
 */
export const convertScriptToCSV = (data: ScriptExportData): string => {
  const { elements } = data;

  // Sort elements by sequence to maintain order
  const sortedElements = [...elements].sort((a, b) => a.sequence - b.sequence);

  // CSV headers
  const headers = [
    'Time',
    'Type', 
    'Element Name',
    'Description',
    'Group Path',
    'Department',
    'Priority',
    'Location',
    'Duration',
    'Color'
  ];

  // Convert elements to CSV rows
  const rows = sortedElements.map(element => {
    // Skip SHOW START elements during export - they're auto-generated on import
    if (element.element_name === 'SHOW START' && element.element_type === 'NOTE') {
      return null;
    }

    const groupPath = buildGroupPath(element, sortedElements);
    
    return [
      formatTimeOffset(element.offset_ms, false),
      element.element_type,
      element.element_name,
      element.cue_notes || '',
      groupPath,
      element.department_name || '',
      element.priority,
      element.location_details || '',
      element.duration_ms ? formatTimeOffset(element.duration_ms, false) : '',
      element.custom_color || ''
    ];
  }).filter(row => row !== null); // Remove null entries (SHOW START)

  // Build CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(field => {
        // Escape fields that contain commas, quotes, or newlines
        if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
};

/**
 * Download CSV file with destination selection
 */
export const downloadCSV = async (csvContent: string, filename: string): Promise<void> => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Check if the File System Access API is supported
  if ('showSaveFilePicker' in window) {
    try {
      // Prompt user to select destination
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'CSV files',
            accept: {
              'text/csv': ['.csv'],
            },
          },
        ],
      });
      
      // Write the file to the selected location
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      return;
    } catch (error) {
      // User cancelled the dialog or other error occurred
      if ((error as Error).name === 'AbortError') {
        // User cancelled - don't show error, just return
        return;
      }
      // For other errors, fall back to automatic download
      console.warn('Failed to use File System Access API, falling back to automatic download:', error);
    }
  }
  
  // Fallback to automatic download for unsupported browsers or if File System Access fails
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Generate filename for script export
 */
export const generateExportFilename = (scriptName: string): string => {
  const sanitizedName = scriptName
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase();
  
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${sanitizedName}_${timestamp}.csv`;
};

/**
 * Main export function - fetches script data and triggers download
 */
export const exportScriptAsCSV = async (
  scriptId: string,
  authToken: string
): Promise<void> => {
  try {
    // Fetch script data
    const scriptResponse = await fetch(`/api/scripts/${scriptId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!scriptResponse.ok) {
      throw new Error('Failed to fetch script data');
    }
    
    const script = await scriptResponse.json();

    // Fetch script elements
    const elementsResponse = await fetch(`/api/scripts/${scriptId}/elements`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!elementsResponse.ok) {
      throw new Error('Failed to fetch script elements');
    }
    
    const elements = await elementsResponse.json();

    // Prepare export data
    const exportData: ScriptExportData = {
      script,
      elements
    };

    // Convert to CSV and download
    const csvContent = convertScriptToCSV(exportData);
    const filename = generateExportFilename(script.script_name);
    
    await downloadCSV(csvContent, filename);
    
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};