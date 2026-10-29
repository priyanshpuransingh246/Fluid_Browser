export interface CharacterReferenceAsset {
  id: string;
  name: string;
  fileName: string;
  url: string;
  uploadedInAccounts: string[];
}

export const INITIAL_CHARACTER_REFERENCES: CharacterReferenceAsset[] = [
  {
    id: 'ref-old-changez',
    name: 'OLD CHANGEZ KHAN',
    fileName: 'OLD_CHANGEZ_KHAN.jpeg',
    url: '/assets/aistudio/OLD_CHANGEZ_KHAN_fe741f17.jpeg',
    uploadedInAccounts: ['Account_1'],
  },
  {
    id: 'ref-young-changez',
    name: 'YOUNG ADULT CHANGEZ KHAN',
    fileName: 'YOUNG_ADULT_CHANGEZ_KHAN.jpeg',
    url: '/assets/aistudio/YOUNG_ADULT_CHANGEZ_KHAN_5f1c90d7.jpeg',
    uploadedInAccounts: ['Account_1'],
  },
];
