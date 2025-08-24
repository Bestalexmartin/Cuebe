import { IconName } from '../../components/AppIcon';

export interface TutorialFile {
  name: string;
  path: string;
  description: string;
  category: string;
  icon: IconName;
}

export interface QuickAccessItem {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  isDisabled: boolean;
  onClick: () => void;
}

export const SCOPED_TUTORIAL_FILES: TutorialFile[] = [
  {
    name: 'Welcome to Cuebe! 🎭',
    path: 'getting-started/welcome-to-cuebe.md',
    description: 'Your introduction to digital theater production management',
    category: 'Getting Started',
    icon: 'compass'
  },
  {
    name: 'Understanding Your Production Elements',
    path: 'workflows/production-elements-guide.md',
    description: 'Learn about Shows, Scripts, Venues, Departments, and Crew',
    category: 'Core Concepts',
    icon: 'component'
  },
  {
    name: 'Your First Production Setup',
    path: 'workflows/first-production-setup.md',
    description: 'Step-by-step walkthrough of creating your first show',
    category: 'Getting Started',
    icon: 'compass'
  },
  {
    name: 'Script Collaboration Made Simple',
    path: 'features/script-collaboration.md',
    description: 'How your team works together on scripts in real-time',
    category: 'Working Together',
    icon: 'component'
  },
  {
    name: 'Getting Started - Your Questions Answered',
    path: 'faqs/getting-started-faqs.md',
    description: 'The most common questions from new Cuebe users',
    category: 'FAQs',
    icon: 'warning'
  }
];

export const createQuickAccessItems = (loadCategory: (category: string) => void): QuickAccessItem[] => [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'New to Cuebe? Start here!',
    icon: 'compass',
    isDisabled: false,
    onClick: () => loadCategory('Getting Started')
  },
  {
    id: 'core-concepts',
    title: 'Core Concepts',
    description: 'Understanding the building blocks',
    icon: 'component',
    isDisabled: false,
    onClick: () => loadCategory('Core Concepts')
  },
  {
    id: 'working-together',
    title: 'Working Together',
    description: 'Team collaboration features',
    icon: 'component',
    isDisabled: false,
    onClick: () => loadCategory('Working Together')
  },
  {
    id: 'faqs',
    title: 'FAQs',
    description: 'Common questions and answers',
    icon: 'warning',
    isDisabled: false,
    onClick: () => loadCategory('FAQs')
  }
];