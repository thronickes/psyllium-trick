
export interface WeightEntry {
  date: number;
  weight: number;
}

export interface UserProfile {
  name: string;
  age: number;
  height: number;
  weight: number;
  targetWeight?: number;
  sex: 'Femenino' | 'Masculino' | 'Prefiero no dizer';
  startDate: number; // Timestamp
  intolerances?: string[];
  otherIntolerance?: string;
  weightHistory?: WeightEntry[];
}

export interface PhaseContent {
  id: number;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string;
  dayRange: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
