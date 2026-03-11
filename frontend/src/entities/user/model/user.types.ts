export type UserRank = 'NEWBIE' | 'ACTIVE' | 'YB' | 'OB';
export type UserStatus = 'ACTIVE' | 'DELETED';
export type UserRole = 'USER' | 'ADMIN' | 'GUEST';

export interface User {
  userId: number;
  allUserId: number;
  name: string;
  cohort: number;
  email: string;
  nickname: string;
  rank: UserRank;
  status: UserStatus;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}