export interface ApiResponse<T = any> {
  errorCode?: string;
  message?: string;
  data?: T;
}

export type FrontSharedSpace = FrontSharedSpaceCreation & {
  id?: number;
};

export interface FrontSharedSpaceCreation {
  nameCode: string;
  nameEn: string;
  nameJp: string;
  descriptionEn: string | null;
  descriptionJp: string | null;
  startDayTime: string;
  endDayTime: string;
  picture?: string;
  maxBookingHours: number;
  maxBookingByUser: number;
}

export type FrontBooking = FrontBookingCreation & {
  id: number;
};

export interface FrontBookingCreation {
  startDate: string;
  endDate: string;
  username: string;
  roomNumber: string;
  picture?: string | undefined;
  sharedSpaceId: number;
}

export type FrontUser = FrontUserCreation & {
  id?: string;
};

export type FrontUserCreation = {
  username: string;
  roomNumber: number;
  email: string;
  profilePicture: string | undefined;
  isAdmin: boolean;
  isActive?: boolean;
};
