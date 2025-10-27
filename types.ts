
export interface Character {
  id: number;
  uid: string;
  image: string | null; // base64 data URL
}

export interface ImageSlotData {
  id: number;
  prompt: string;
  imageUrl: string | null; // base64 data URL
  isLoading: boolean;
  characterIds: number[];
}
