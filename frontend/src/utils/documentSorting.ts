// frontend/src/utils/documentSorting.ts

export interface DocFile {
  name: string;
  path: string;
  description: string;
  category: 'Planning' | 'Quick Start' | 'System Architecture' | 'Component Architecture' | 'Data Management' | 'User Interface' | 'Testing' | 'Tutorial' | 'Archive';
  icon: 'planning' | 'roadmap' | 'compass' | 'docs' | 'component' | 'performance' | 'warning' | 'test' | 'archive';
}

// Define category-specific ordering rules
const CATEGORY_SORT_ORDERS: Record<string, string[]> = {
  'Quick Start': [
    'Documentation Index',
    'Development Guide', 
    'Database Seed Data System',
    'Testing Tools Guide'
  ],
  'Planning': [
    'Development Roadmap',
    'Code Quality Guide', 
    'Documentation Standards',
    'State Management Principles',
    'Architectural Principles'
  ]
};

/**
 * Sort documents within a category based on predefined order or alphabetically
 */
export const sortDocumentsInCategory = (docs: DocFile[], category: string): DocFile[] => {
  const categoryOrder = CATEGORY_SORT_ORDERS[category];
  
  if (categoryOrder) {
    return docs.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.name);
      const bIndex = categoryOrder.indexOf(b.name);
      
      // Both not in order list - sort alphabetically
      if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
      
      // Only one in order list - prioritize the ordered one
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      // Both in order list - use predefined order
      return aIndex - bIndex;
    });
  }
  
  // For categories without predefined order, sort alphabetically
  return docs.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Group documents by category and sort both categories and documents within categories
 */
export const groupAndSortDocuments = (
  documents: DocFile[], 
  categoryOrder: string[]
): [string, DocFile[]][] => {
  // Group documents by category
  const groupedDocs = documents.reduce((groups, doc) => {
    if (!groups[doc.category]) groups[doc.category] = [];
    groups[doc.category].push(doc);
    return groups;
  }, {} as Record<string, DocFile[]>);

  // Sort documents within each category
  Object.keys(groupedDocs).forEach(category => {
    groupedDocs[category] = sortDocumentsInCategory(groupedDocs[category], category);
  });

  // Sort categories by the provided order
  return Object.entries(groupedDocs).sort(([categoryA], [categoryB]) => {
    const indexA = categoryOrder.indexOf(categoryA);
    const indexB = categoryOrder.indexOf(categoryB);
    
    if (indexA === -1 && indexB === -1) return categoryA.localeCompare(categoryB);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });
};

/**
 * Get documents for a specific category, sorted according to category rules
 */
export const getDocumentsForCategory = (
  documents: DocFile[], 
  category: string
): DocFile[] => {
  const categoryDocs = documents.filter(doc => doc.category === category);
  return sortDocumentsInCategory(categoryDocs, category);
};